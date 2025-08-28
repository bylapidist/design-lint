import { promises as fs } from 'fs';
import path from 'path';
import ts from 'typescript';
import postcss from 'postcss';
import { createRequire } from 'module';
import fg from 'fast-glob';
import ignore from 'ignore';
import { performance } from 'node:perf_hooks';
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

export interface Config {
  tokens?: DesignTokens;
  rules?: Record<string, unknown>;
  ignoreFiles?: string[];
  plugins?: string[];
  configPath?: string;
}

const defaultIgnore = [
  '**/node_modules/**',
  'node_modules/**',
  '**/dist/**',
  'dist/**',
  '**/build/**',
  'build/**',
  '**/coverage/**',
  'coverage/**',
  '**/.next/**',
  '.next/**',
  '**/.nuxt/**',
  '.nuxt/**',
  '**/out/**',
  'out/**',
  '**/.cache/**',
  '.cache/**',
];

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
          mod = await import(resolved);
        } else {
          mod = req(resolved);
        }
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'ERR_REQUIRE_ESM') {
          mod = await import(resolved ?? p);
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
        this.ruleMap.set(rule.name, rule);
      }
    }
  }

  async lintFiles(
    targets: string[],
    fix = false,
    cache?: Map<string, { mtime: number; result: LintResult }>,
  ): Promise<LintResult[]> {
    await this.pluginLoad;
    const ignorePatterns = [...defaultIgnore];
    const ignoreFile = path.join(process.cwd(), '.designlintignore');
    try {
      const content = await fs.readFile(ignoreFile, 'utf8');
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      ignorePatterns.push(...lines);
    } catch {
      // no ignore file
    }
    if (this.config.ignoreFiles)
      ignorePatterns.push(...this.config.ignoreFiles);

    const ig = ignore();
    const normalizedPatterns = ignorePatterns.map((p) => p.replace(/\\/g, '/'));
    ig.add(normalizedPatterns);

    const files: string[] = [];
    const scanStart = performance.now();
    for (const t of targets) {
      const full = path.resolve(t);
      const rel = path.relative(process.cwd(), full).replace(/\\/g, '/');
      if (ig.ignores(rel)) continue;
      try {
        const stat = await fs.stat(full);
        if (stat.isDirectory()) {
          const entries = await fg('**/*.{ts,tsx,js,jsx,css,svelte,vue}', {
            cwd: full,
            absolute: true,
            dot: true,
            ignore: normalizedPatterns,
          });
          files.push(...entries);
        } else {
          files.push(full);
        }
      } catch {
        // skip missing files
      }
    }
    const scanTime = performance.now() - scanStart;
    if (process.env.DESIGNLINT_PROFILE) {
      // eslint-disable-next-line no-console
      console.log(`Scanned ${files.length} files in ${scanTime.toFixed(2)}ms`);
    }

    if (cache) {
      for (const key of Array.from(cache.keys())) {
        if (!files.includes(key)) cache.delete(key);
      }
    }

    const tasks = files.map(async (filePath) => {
      try {
        const stat = await fs.stat(filePath);
        const cached = cache?.get(filePath);
        if (cached && cached.mtime === stat.mtimeMs && !fix) {
          return cached.result;
        }
        const text = await fs.readFile(filePath, 'utf8');
        let result = await this.lintText(text, filePath);
        if (fix) {
          const output = applyFixes(text, result.messages);
          if (output !== text) {
            await fs.writeFile(filePath, output, 'utf8');
            result = await this.lintText(output, filePath);
          }
        }
        cache?.set(filePath, { mtime: stat.mtimeMs, result });
        return result;
      } catch {
        cache?.delete(filePath);
        return { filePath, messages: [] } as LintResult;
      }
    });

    const results = await Promise.all(tasks);
    return results;
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
          line: typeof err.line === 'number' ? err.line : 0,
          column: typeof err.column === 'number' ? err.column : 0,
        });
      }
    } else if (/\.svelte$/.test(filePath)) {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - svelte compiler lacks type declarations
        const { parse } = await import('svelte/compiler');
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
        const template = ast.html
          ? text.slice(ast.html.start, ast.html.end)
          : '';
        const templateTsx = template
          .replace(/class=/g, 'className=')
          .replace(
            /style="padding: {([^}]+)}px"/g,
            (_, expr) => `style={{ ${expr.trim()} }}`,
          );
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
          line: typeof err.line === 'number' ? err.line : 0,
          column: typeof err.column === 'number' ? err.column : 0,
        });
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
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
    for (const [name, setting] of Object.entries(ruleConfig)) {
      const rule = this.ruleMap.get(name);
      if (!rule) continue;
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
    return entries;
  }

  private normalizeSeverity(value: unknown): 'error' | 'warn' | undefined {
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
        line: d.source?.start?.line || 0,
        column: d.source?.start?.column || 0,
      });
    });
  } catch (e: unknown) {
    const err = e as { line?: number; column?: number; message?: string };
    messages.push({
      ruleId: 'parse-error',
      message: err.message || 'Failed to parse CSS',
      severity: 'error',
      line: typeof err.line === 'number' ? err.line : 0,
      column: typeof err.column === 'number' ? err.column : 0,
    });
  }
  return decls;
}

function applyFixes(text: string, messages: LintMessage[]): string {
  const fixes: Fix[] = messages
    .filter((m): m is LintMessage & { fix: Fix } => !!m.fix)
    .map((m) => m.fix);
  if (fixes.length === 0) return text;
  fixes.sort((a, b) => b.range[0] - a.range[0]);
  for (const f of fixes) {
    const [start, end] = f.range;
    text = text.slice(0, start) + f.text + text.slice(end);
  }
  return text;
}
