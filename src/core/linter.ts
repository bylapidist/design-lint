import { promises as fs } from 'fs';
import ts from 'typescript';
import postcss from 'postcss';
import pLimit from 'p-limit';
import os from 'node:os';
import type { parse as svelteParse } from 'svelte/compiler';
import type {
  LintResult,
  RuleModule,
  RuleContext,
  LintMessage,
  DesignTokens,
  CSSDeclaration,
  Fix,
} from './types.js';
import { builtInRules } from '../rules/index.js';
export { defaultIgnore } from './ignore.js';
import { loadPlugins } from './plugin-loader.js';
import { scanFiles } from './file-scanner.js';
import { loadCache, saveCache, type CacheMap } from './cache.js';
import { normalizeTokens } from './token-loader.js';

export interface Config {
  tokens?: DesignTokens;
  rules?: Record<string, unknown>;
  ignoreFiles?: string[];
  plugins?: string[];
  configPath?: string;
  concurrency?: number;
  patterns?: string[];
  wrapTokensWithVar?: boolean;
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

/**
 * Lints files using built-in and plugin-provided rules.
 */
export class Linter {
  private config: Config;
  private ruleMap: Map<string, { rule: RuleModule; source: string }> =
    new Map();
  private pluginLoad: Promise<void>;
  private cacheLoaded = false;

  /**
   * Create a new Linter instance.
   * @param config Linter configuration.
   */
  constructor(config: Config) {
    this.config = {
      ...config,
      tokens: normalizeTokens(config.tokens, config.wrapTokensWithVar ?? false),
    };
    for (const rule of builtInRules) {
      this.ruleMap.set(rule.name, { rule, source: 'built-in' });
    }
    this.pluginLoad = loadPlugins(this.config, this.ruleMap, createEngineError);
  }

  /**
   * Lint a single file.
   * @param filePath Path to the file.
   * @param fix Apply fixes to the file.
   * @param cache Optional in-memory result cache.
   * @param ignorePaths Additional ignore pattern files.
   * @param cacheLocation Path to persistent cache file.
   * @returns The lint result for the file.
   */
  async lintFile(
    filePath: string,
    fix = false,
    cache?: CacheMap,
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

  /**
   * Lint multiple files or directories.
   * @param targets Paths or globs to lint.
   * @param fix Apply fixes to matching files.
   * @param cache Optional in-memory cache map.
   * @param additionalIgnorePaths Additional ignore files.
   * @param cacheLocation Persistent cache file location.
   * @returns Lint results and list of ignore files encountered.
   */
  async lintFiles(
    targets: string[],
    fix = false,
    cache?: CacheMap,
    additionalIgnorePaths: string[] = [],
    cacheLocation?: string,
  ): Promise<{
    results: LintResult[];
    ignoreFiles: string[];
    warning?: string;
  }> {
    await this.pluginLoad;
    if (cacheLocation && cache && !this.cacheLoaded) {
      await loadCache(cache, cacheLocation);
      this.cacheLoaded = true;
    }
    const { files, ignoreFiles } = await scanFiles(
      targets,
      this.config,
      additionalIgnorePaths,
    );
    if (files.length === 0) {
      return {
        results: [],
        ignoreFiles,
        warning: 'No files matched the provided patterns.',
      };
    }
    if (cache) {
      for (const key of Array.from(cache.keys())) {
        if (!files.includes(key)) cache.delete(key);
      }
    }
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
        } catch (e: unknown) {
          cache?.delete(filePath);
          const err = e as { message?: string };
          return {
            filePath,
            messages: [
              {
                ruleId: 'parse-error',
                message: err.message || 'Failed to read file',
                severity: 'error',
                line: 1,
                column: 1,
              },
            ],
          } as LintResult;
        }
      }),
    );

    const results = await Promise.all(tasks);
    if (cacheLocation && cache) {
      await saveCache(cache, cacheLocation);
    }
    return { results, ignoreFiles };
  }

  /**
   * Lint raw text.
   * @param text Source content to lint.
   * @param filePath Pseudo path used in messages.
   * @returns Lint result containing messages.
   */
  async lintText(text: string, filePath = 'unknown'): Promise<LintResult> {
    await this.pluginLoad;
    const enabled = this.getEnabledRules();
    const messages: LintResult['messages'] = [];
    const ruleDescriptions: Record<string, string> = {};
    const disabledLines = getDisabledLines(text);
    const contextBase: Omit<RuleContext, 'options'> = {
      report: () => {},
      tokens: (this.config.tokens || {}) as DesignTokens,
      filePath,
    };
    const listeners = enabled.map(({ rule, options, severity }) => {
      ruleDescriptions[rule.name] = rule.meta.description;
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
    const filtered = messages.filter((m) => !disabledLines.has(m.line));
    return { filePath, messages: filtered, ruleDescriptions };
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
      const entry = this.ruleMap.get(name);
      if (!entry) {
        unknown.push(name);
        continue;
      }
      const rule = entry.rule;
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

function getDisabledLines(text: string): Set<number> {
  const disabled = new Set<number>();
  const lines = text.split(/\r?\n/);
  let block = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\/\*\s*design-lint-disable\s*\*\//.test(line)) {
      block = true;
      continue;
    }
    if (/\/\*\s*design-lint-enable\s*\*\//.test(line)) {
      block = false;
      continue;
    }
    if (/design-lint-disable-next-line/.test(line)) {
      disabled.add(i + 2);
      continue;
    }
    if (block) disabled.add(i + 1);
  }
  return disabled;
}

/**
 * Apply fixes to source text.
 * @param text Original source code.
 * @param messages Messages that may include fixes.
 * @returns Text with all non-overlapping fixes applied.
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
