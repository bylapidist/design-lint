import { promises as fs } from 'fs';
import path from 'path';
import ts from 'typescript';
import postcss from 'postcss';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fg from 'fast-glob';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import type { parse as svelteParse } from 'svelte/compiler';
import type {
  LintResult,
  RuleModule,
  RuleContext,
  LintMessage,
  DesignTokens,
  CSSDeclaration,
  Fix,
  PluginModule,
} from './types';
import { builtInRules } from '../rules';
import { loadIgnore } from './ignore';
import { relFromCwd, realpathIfExists } from '../utils/paths';
export { defaultIgnore } from './ignore';

export interface Config {
  tokens?: DesignTokens;
  rules?: Record<string, unknown>;
  ignoreFiles?: string[];
  plugins?: string[];
  configPath?: string;
  concurrency?: number;
  patterns?: string[];
}

interface EngineErrorOptions {
  message: string;
  context: string;
  remediation: string;
}

function createEngineError(opts: EngineErrorOptions): Error {
  return new Error(
    `${opts.message}\nContext: ${opts.context}\nRemediation: ${opts.remediation}`,
  );
}

export class Linter {
  private config: Config;
  private ruleMap: Map<string, RuleModule> = new Map();
  private pluginLoad: Promise<void>;
  private cacheLoaded = false;

  constructor(config: Config) {
    this.config = config;
    for (const rule of builtInRules) {
      this.ruleMap.set(rule.name, rule);
    }
    this.pluginLoad = this.loadPlugins();
  }

  private async loadPlugins(): Promise<void> {
    const req = this.config.configPath
      ? createRequire(this.config.configPath)
      : require;
    for (const p of this.config.plugins || []) {
      let mod: unknown;
      let resolved: string | undefined;
      try {
        resolved = req.resolve(p);
        if (resolved.endsWith('.mjs')) {
          mod = await import(`${pathToFileURL(resolved).href}?t=${Date.now()}`);
        } else {
          mod = req(resolved);
        }
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'ERR_REQUIRE_ESM') {
          const esmPath = resolved ?? p;
          mod = await import(`${pathToFileURL(esmPath).href}?t=${Date.now()}`);
        } else {
          throw createEngineError({
            message: `Failed to load plugin "${p}": ${
              e instanceof Error ? e.message : String(e)
            }`,
            context: `Plugin "${p}"`,
            remediation: 'Ensure the plugin is installed and resolvable.',
          });
        }
      }
      const plugin =
        (mod as { default?: PluginModule; plugin?: PluginModule }).default ??
        (mod as { plugin?: PluginModule }).plugin ??
        (mod as PluginModule);
      if (
        !plugin ||
        typeof plugin !== 'object' ||
        !Array.isArray((plugin as PluginModule).rules)
      ) {
        throw createEngineError({
          message: `Invalid plugin "${p}": expected { rules: RuleModule[] }`,
          context: `Plugin "${p}"`,
          remediation: 'Export an object with a "rules" array.',
        });
      }
      for (const rule of plugin.rules) {
        if (
          !rule ||
          typeof rule.name !== 'string' ||
          rule.name.trim() === '' ||
          !rule.meta ||
          typeof rule.meta.description !== 'string' ||
          rule.meta.description.trim() === '' ||
          typeof rule.create !== 'function'
        ) {
          throw createEngineError({
            message:
              `Invalid rule "${(rule as { name?: string }).name ?? '<unknown>'}" in plugin "${p}": ` +
              'expected { name: string; meta: { description: string }; create: Function }',
            context: `Plugin "${p}"`,
            remediation:
              'Ensure each rule has a non-empty name, meta.description, and a create function.',
          });
        }
        if (this.ruleMap.has(rule.name)) {
          throw createEngineError({
            message: `Rule "${rule.name}" from plugin "${p}" conflicts with an existing rule`,
            context: `Plugin "${p}"`,
            remediation: 'Use a unique rule name to avoid collisions.',
          });
        }
        this.ruleMap.set(rule.name, rule);
      }
    }
  }

  async lintFile(
    filePath: string,
    fix = false,
    cache?: Map<string, { mtime: number; result: LintResult }>,
    ignorePaths?: string[],
    cacheLocation?: string,
  ): Promise<LintResult> {
    const { results } = await this.lintFiles(
      [filePath],
      fix,
      cache,
      ignorePaths ?? [],
      cacheLocation,
    );
    const [res] = results;
    return res ?? { filePath, messages: [] };
  }

  async lintFiles(
    targets: string[],
    fix = false,
    cache?: Map<string, { mtime: number; result: LintResult }>,
    additionalIgnorePaths: string[] = [],
    cacheLocation?: string,
  ): Promise<{ results: LintResult[]; ignoreFiles: string[] }> {
    await this.pluginLoad;
    if (cacheLocation && cache && !this.cacheLoaded) {
      try {
        const raw = await fs.readFile(cacheLocation, 'utf8');
        const data = JSON.parse(raw) as [
          string,
          { mtime: number; result: LintResult },
        ][];
        for (const [k, v] of data) cache.set(k, v);
      } catch {
        // ignore
      }
      this.cacheLoaded = true;
    }
    const { ig, patterns: ignorePatterns } = await loadIgnore(
      this.config,
      additionalIgnorePaths,
    );
    const normalizedPatterns = [...ignorePatterns];
    const scanPatterns = this.config.patterns ?? [
      '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,css,svelte,vue}',
    ];
    const seenIgnore = new Set<string>();

    // track root ignore files if they exist
    for (const root of [
      '.gitignore',
      '.designlintignore',
      ...additionalIgnorePaths,
    ]) {
      const full = path.resolve(process.cwd(), root);
      try {
        await fs.access(full);
        seenIgnore.add(full);
      } catch {
        // ignore missing
      }
    }

    const readNestedIgnore = async (dir: string) => {
      const ignoreFiles = (
        await fg(['**/.gitignore', '**/.designlintignore'], {
          cwd: dir,
          absolute: true,
          dot: true,
          ignore: normalizedPatterns,
        })
      ).map(realpathIfExists);
      ignoreFiles.sort(
        (a, b) => a.split(path.sep).length - b.split(path.sep).length,
      );
      for (const file of ignoreFiles) {
        if (seenIgnore.has(file)) continue;
        seenIgnore.add(file);
        const dirOfFile = path.dirname(file);
        const relDir = relFromCwd(dirOfFile);
        if (relDir === '') continue;
        try {
          const content = await fs.readFile(file, 'utf8');
          const lines = content
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#'))
            .map((l) => {
              const neg = l.startsWith('!');
              const pattern = neg ? l.slice(1) : l;
              const cleaned = pattern
                .replace(/^[\\/]+/, '')
                .replace(/\\/g, '/');
              const combined = relDir
                ? path.posix.join(relDir, cleaned)
                : cleaned;
              return neg ? `!${combined}` : combined;
            });
          ig.add(lines);
          normalizedPatterns.push(...lines);
        } catch {
          // ignore
        }
      }
    };

    const files: string[] = [];
    const scanStart = performance.now();
    for (const t of targets) {
      const full = realpathIfExists(path.resolve(t));
      const rel = relFromCwd(full);
      if (ig.ignores(rel)) continue;
      try {
        const stat = await fs.stat(full);
        if (stat.isDirectory()) {
          await readNestedIgnore(full);
          const entries = await fg(scanPatterns, {
            cwd: full,
            absolute: true,
            dot: true,
            ignore: normalizedPatterns,
          });
          for (const e of entries) files.push(realpathIfExists(e));
        } else {
          files.push(full);
        }
      } catch {
        // skip missing files
      }
    }
    const scanTime = performance.now() - scanStart;
    if (process.env.DESIGNLINT_PROFILE) {
      console.log(`Scanned ${files.length} files in ${scanTime.toFixed(2)}ms`);
    }

    if (cache) {
      for (const key of Array.from(cache.keys())) {
        if (!files.includes(key)) cache.delete(key);
      }
    }

    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(this.config.concurrency ?? os.cpus().length);
    const tasks = files.map((filePath) =>
      limit(async () => {
        try {
          const stat = await fs.stat(filePath);
          const cached = cache?.get(filePath);
          if (cached && cached.mtime === stat.mtimeMs && !fix) {
            return cached.result;
          }
          const text = await fs.readFile(filePath, 'utf8');
          let result = await this.lintText(text, filePath);
          let mtime = stat.mtimeMs;
          if (fix) {
            const output = applyFixes(text, result.messages);
            if (output !== text) {
              await fs.writeFile(filePath, output, 'utf8');
              result = await this.lintText(output, filePath);
              const newStat = await fs.stat(filePath);
              mtime = newStat.mtimeMs;
            }
          }
          cache?.set(filePath, { mtime, result });
          return result;
        } catch {
          cache?.delete(filePath);
          return { filePath, messages: [] } as LintResult;
        }
      }),
    );

    const results = await Promise.all(tasks);
    if (cacheLocation && cache) {
      try {
        await fs.mkdir(path.dirname(cacheLocation), { recursive: true });
        await fs.writeFile(
          cacheLocation,
          JSON.stringify([...cache.entries()]),
          'utf8',
        );
      } catch {
        // ignore
      }
    }
    return { results, ignoreFiles: Array.from(seenIgnore) };
  }

  async lintText(text: string, filePath = 'unknown'): Promise<LintResult> {
    await this.pluginLoad;
    const enabled = this.getEnabledRules();
    const messages: LintResult['messages'] = [];
    const contextBase: Omit<RuleContext, 'options'> = {
      report: () => {},
      tokens: (this.config.tokens || {}) as DesignTokens,
      filePath,
    };
    const listeners = enabled.map(({ rule, options, severity }) => {
      const ctx: RuleContext = {
        ...contextBase,
        options,
        report: (m) =>
          messages.push({ ...m, severity, ruleId: rule.name } as LintMessage),
      };
      return rule.create(ctx);
    });

    if (/\.vue$/.test(filePath)) {
      try {
        const { parse } = await import('@vue/compiler-sfc');
        const { descriptor } = parse(text, { filename: filePath });
        const template = descriptor.template?.content ?? '';
        const templateTsx = template
          .replace(/class=/g, 'className=')
          .replace(
            /:style="{([^}]+)}"/g,
            (_, expr) => `style={{ ${expr.trim()} }}`,
          );
        const scripts: string[] = [];
        if (descriptor.script?.content) scripts.push(descriptor.script.content);
        if (descriptor.scriptSetup?.content)
          scripts.push(descriptor.scriptSetup.content);
        const scriptBlocks = scripts.length ? scripts : [''];
        for (const scriptContent of scriptBlocks) {
          const combined = `${scriptContent}\nfunction __render(){ return (${templateTsx}); }`;
          const source = ts.createSourceFile(
            filePath,
            combined,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX,
          );
          const visit = (node: ts.Node) => {
            for (const l of listeners) l.onNode?.(node);
            ts.forEachChild(node, visit);
          };
          visit(source);
        }
        for (const style of descriptor.styles) {
          const decls = parseCSS(style.content, messages);
          for (const decl of decls) {
            for (const l of listeners) l.onCSSDeclaration?.(decl);
          }
        }
      } catch (e: unknown) {
        const err = e as { line?: number; column?: number; message?: string };
        messages.push({
          ruleId: 'parse-error',
          message: err.message || 'Failed to parse Vue component',
          severity: 'error',
          line: typeof err.line === 'number' ? err.line : 1,
          column: typeof err.column === 'number' ? err.column : 1,
        });
      }
    } else if (/\.svelte$/.test(filePath)) {
      try {
        const { parse } = (await import('svelte/compiler')) as {
          parse: typeof svelteParse;
        };
        const ast = parse(text);
        const scripts: string[] = [];
        if (ast.instance)
          scripts.push(
            text.slice(ast.instance.content.start, ast.instance.content.end),
          );
        if (ast.module)
          scripts.push(
            text.slice(ast.module.content.start, ast.module.content.end),
          );

        const styleDecls: CSSDeclaration[] = [];
        const replacements: { start: number; end: number; text: string }[] = [];

        const getLineAndColumn = (pos: number) => {
          const sliced = text.slice(0, pos).split(/\r?\n/);
          const line = sliced.length;
          const column = sliced[sliced.length - 1].length + 1;
          return { line, column };
        };

        const extractStyleAttribute = (attr: {
          start: number;
          end: number;
          value: Array<{
            type: string;
            data?: string;
            expression?: { start: number; end: number };
          }>;
        }): CSSDeclaration[] => {
          const exprs: string[] = [];
          let content = '';
          for (const part of attr.value) {
            if (part.type === 'Text') content += part.data ?? '';
            else if (part.type === 'MustacheTag') {
              const i = exprs.length;
              exprs.push(
                text.slice(part.expression!.start, part.expression!.end),
              );
              content += `__EXPR_${i}__`;
            }
          }
          const attrText = text.slice(attr.start, attr.end);
          const eqIdx = attrText.indexOf('=');
          const valueStart = attr.start + eqIdx + 2; // after opening quote
          // match arbitrary "prop: value" pairs within the style attribute
          // and allow multiple declarations separated by semicolons
          const regex = /([^:;]+?)\s*:\s*([^;]+?)(?:;|$)/g;
          const decls: CSSDeclaration[] = [];
          let m: RegExpExecArray | null;
          while ((m = regex.exec(content))) {
            const prop = m[1].trim();
            let value = m[2]
              .trim()
              .replace(/__EXPR_(\d+)__/g, (_, i) => exprs[Number(i)]);
            const { line, column } = getLineAndColumn(valueStart + m.index);
            decls.push({ prop, value, line, column });
          }
          return decls;
        };

        const walk = (node: unknown): void => {
          const n = node as { attributes?: unknown[]; children?: unknown[] };
          if (!n) return;
          for (const attrRaw of n.attributes ?? []) {
            const attr = attrRaw as {
              type: string;
              name: string;
              start: number;
              end: number;
              value: Array<{
                type: string;
                data?: string;
                expression?: { start: number; end: number };
              }>;
            };
            if (attr.type === 'Attribute' && attr.name === 'style') {
              styleDecls.push(...extractStyleAttribute(attr));
              replacements.push({
                start: attr.start,
                end: attr.end,
                text: 'style={{}}',
              });
            } else if (attr.type === 'StyleDirective') {
              const value = attr.value
                .map((v) =>
                  v.type === 'Text'
                    ? v.data
                    : text.slice(v.expression!.start, v.expression!.end),
                )
                .join('')
                .trim();
              const { line, column } = getLineAndColumn(attr.start);
              styleDecls.push({ prop: attr.name, value, line, column });
              replacements.push({ start: attr.start, end: attr.end, text: '' });
            }
          }
          for (const child of n.children ?? []) walk(child);
        };
        walk(ast.html);

        const templateStart = ast.html?.start ?? 0;
        let template = ast.html ? text.slice(ast.html.start, ast.html.end) : '';
        replacements
          .sort((a, b) => b.start - a.start)
          .forEach((r) => {
            const start = r.start - templateStart;
            const end = r.end - templateStart;
            template = template.slice(0, start) + r.text + template.slice(end);
          });
        const templateTsx = template.replace(/class=/g, 'className=');

        const scriptBlocks = scripts.length ? scripts : [''];
        for (const scriptContent of scriptBlocks) {
          const combined = `${scriptContent}\nfunction __render(){ return (${templateTsx}); }`;
          const source = ts.createSourceFile(
            filePath,
            combined,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX,
          );
          const visit = (node: ts.Node) => {
            for (const l of listeners) l.onNode?.(node);
            ts.forEachChild(node, visit);
          };
          visit(source);
        }
        for (const decl of styleDecls) {
          for (const l of listeners) l.onCSSDeclaration?.(decl);
        }
        if (ast.css) {
          const styleText = text.slice(
            ast.css.content.start,
            ast.css.content.end,
          );
          const decls = parseCSS(styleText, messages);
          for (const decl of decls) {
            for (const l of listeners) l.onCSSDeclaration?.(decl);
          }
        }
      } catch (e: unknown) {
        const err = e as { line?: number; column?: number; message?: string };
        messages.push({
          ruleId: 'parse-error',
          message: err.message || 'Failed to parse Svelte component',
          severity: 'error',
          line: typeof err.line === 'number' ? err.line : 1,
          column: typeof err.column === 'number' ? err.column : 1,
        });
      }
    } else if (/\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(filePath)) {
      const source = ts.createSourceFile(
        filePath,
        text,
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node) => {
        for (const l of listeners) l.onNode?.(node);
        ts.forEachChild(node, visit);
      };
      visit(source);
    } else if (/\.css$/.test(filePath)) {
      const decls = parseCSS(text, messages);
      for (const decl of decls) {
        for (const l of listeners) l.onCSSDeclaration?.(decl);
      }
    }

    return { filePath, messages };
  }

  private getEnabledRules(): {
    rule: RuleModule;
    options: unknown;
    severity: 'error' | 'warn';
  }[] {
    const entries: {
      rule: RuleModule;
      options: unknown;
      severity: 'error' | 'warn';
    }[] = [];
    const ruleConfig = (this.config.rules || {}) as Record<string, unknown>;
    const unknown: string[] = [];
    for (const [name, setting] of Object.entries(ruleConfig)) {
      const rule = this.ruleMap.get(name);
      if (!rule) {
        unknown.push(name);
        continue;
      }
      let severity: 'error' | 'warn' | undefined;
      let options: unknown = undefined;
      if (Array.isArray(setting)) {
        severity = this.normalizeSeverity(setting[0]);
        options = setting[1];
      } else {
        severity = this.normalizeSeverity(setting);
      }
      if (severity) {
        entries.push({ rule, options, severity });
      }
    }
    if (unknown.length > 0) {
      throw createEngineError({
        message: `Unknown rule(s): ${unknown.join(', ')}`,
        context: 'Config.rules',
        remediation: 'Remove or correct these rule names.',
      });
    }
    return entries;
  }

  private normalizeSeverity(value: unknown): 'error' | 'warn' | undefined {
    if (value === 0 || value === 'off') return undefined;
    if (value === 2 || value === 'error') return 'error';
    if (value === 1 || value === 'warn') return 'warn';
    return undefined;
  }
}

function parseCSS(
  text: string,
  messages: LintMessage[] = [],
): CSSDeclaration[] {
  const decls: CSSDeclaration[] = [];
  try {
    const root = postcss.parse(text);
    root.walkDecls((d) => {
      decls.push({
        prop: d.prop,
        value: d.value,
        line: d.source?.start?.line || 1,
        column: d.source?.start?.column || 1,
      });
    });
  } catch (e: unknown) {
    const err = e as { line?: number; column?: number; message?: string };
    messages.push({
      ruleId: 'parse-error',
      message: err.message || 'Failed to parse CSS',
      severity: 'error',
      line: typeof err.line === 'number' ? err.line : 1,
      column: typeof err.column === 'number' ? err.column : 1,
    });
  }
  return decls;
}

/**
 * Apply text fixes to the given source. Fix ranges are expected to be
 * non-overlapping; if overlapping ranges are detected, later fixes are skipped
 * in favor of earlier ones to avoid conflicting updates.
 */
export function applyFixes(text: string, messages: LintMessage[]): string {
  const fixes: Fix[] = messages
    .filter((m): m is LintMessage & { fix: Fix } => !!m.fix)
    .map((m) => m.fix);
  if (fixes.length === 0) return text;

  // Sort by start position to detect and skip overlapping ranges
  fixes.sort((a, b) => a.range[0] - b.range[0]);
  const filtered: Fix[] = [];
  let lastEnd = -1;
  for (const f of fixes) {
    if (f.range[0] < lastEnd) continue; // overlapping with previous fix
    filtered.push(f);
    lastEnd = f.range[1];
  }

  // Apply fixes from right to left to avoid messing up subsequent ranges
  for (let i = filtered.length - 1; i >= 0; i--) {
    const [start, end] = filtered[i].range;
    text = text.slice(0, start) + filtered[i].text + text.slice(end);
  }
  return text;
}
