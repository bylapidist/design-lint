import { promises as fs } from 'fs';
import ts from 'typescript';
import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import postcssLess from 'postcss-less';
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
import type { Cache, CacheEntry } from './cache.js';
import { normalizeTokens, mergeTokens } from './token-loader.js';
import { extractVarName } from '../utils/token-match.js';

export interface Config {
  tokens?: DesignTokens | Record<string, DesignTokens>;
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
  private tokensByTheme: Record<string, DesignTokens> = {};
  private ruleMap: Map<string, { rule: RuleModule; source: string }> =
    new Map();
  private pluginLoad: Promise<void>;
  private pluginPaths: string[] = [];
  private allTokenValues = new Set<string>();
  private usedTokenValues = new Set<string>();
  private unusedTokenRules: {
    ruleId: string;
    severity: 'error' | 'warn';
    ignored: Set<string>;
  }[] = [];

  /**
   * Create a new Linter instance.
   * @param config Linter configuration.
   */
  constructor(config: Config) {
    const normalized = normalizeTokens(
      config.tokens as DesignTokens | Record<string, DesignTokens>,
      config.wrapTokensWithVar ?? false,
    );
    this.tokensByTheme = normalized.themes;
    this.config = { ...config, tokens: normalized.merged };
    for (const rule of builtInRules) {
      this.ruleMap.set(rule.name, { rule, source: 'built-in' });
    }
    this.pluginLoad = loadPlugins(
      this.config,
      this.ruleMap,
      createEngineError,
    ).then((paths) => {
      this.pluginPaths = paths;
    });
    this.allTokenValues = collectTokenValues(
      this.config.tokens as DesignTokens,
    );
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
    cache?: Cache,
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
   * @param cache Optional in-memory cache.
   * @param additionalIgnorePaths Additional ignore files.
   * @param cacheLocation Persistent cache file location.
   * @returns Lint results and list of ignore files encountered.
   */
  async lintFiles(
    targets: string[],
    fix = false,
    cache?: Cache,
    additionalIgnorePaths: string[] = [],
    cacheLocation?: string,
  ): Promise<{
    results: LintResult[];
    ignoreFiles: string[];
    warning?: string;
  }> {
    await this.pluginLoad;
    const files = await scanFiles(targets, this.config, additionalIgnorePaths);
    const ignoreFiles: string[] = [];
    if (files.length === 0) {
      return {
        results: [],
        ignoreFiles,
        warning: 'No files matched the provided patterns.',
      };
    }
    if (cache) {
      for (const key of cache.keys()) {
        if (!files.includes(key)) cache.removeKey(key);
      }
    }
    const concurrency = Math.max(
      1,
      Math.floor(this.config.concurrency ?? os.cpus().length),
    );
    const limit = pLimit(concurrency);
    const tasks = files.map((filePath) =>
      limit(async () => {
        try {
          const stat = await fs.stat(filePath);
          const cached = cache?.getKey<CacheEntry>(filePath);
          if (
            cached &&
            cached.mtime === stat.mtimeMs &&
            cached.size === stat.size &&
            !fix
          ) {
            return cached.result;
          }
          const text = await fs.readFile(filePath, 'utf8');
          let result = await this.lintText(text, filePath);
          let mtime = stat.mtimeMs;
          let size = stat.size;
          if (fix) {
            const output = applyFixes(text, result.messages);
            if (output !== text) {
              await fs.writeFile(filePath, output, 'utf8');
              result = await this.lintText(output, filePath);
              const newStat = await fs.stat(filePath);
              mtime = newStat.mtimeMs;
              size = newStat.size;
            }
          }
          cache?.setKey(filePath, { mtime, size, result });
          return result;
        } catch (e: unknown) {
          cache?.removeKey(filePath);
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
    for (const { ruleId, severity, ignored } of this.unusedTokenRules) {
      const unused = Array.from(this.allTokenValues).filter(
        (t) => !this.usedTokenValues.has(t) && !ignored.has(t),
      );
      if (unused.length) {
        results.push({
          filePath: this.config.configPath || 'designlint.config',
          messages: unused.map((t) => ({
            ruleId,
            message: `Token ${t} is defined but never used`,
            severity,
            line: 1,
            column: 1,
          })),
        });
      }
    }
    if (cacheLocation && cache) {
      cache.save(true);
    }
    return { results, ignoreFiles };
  }

  /**
   * Retrieve token names for editor completions.
   * @returns Map of token groups to token variable names.
   */
  getTokenCompletions(): Record<string, string[]> {
    const tokens = (this.config.tokens || {}) as DesignTokens;
    const completions: Record<string, string[]> = {};
    for (const [group, defs] of Object.entries(tokens)) {
      if (Array.isArray(defs)) {
        const names = defs.filter((t): t is string => typeof t === 'string');
        if (names.length) completions[group] = names;
      } else if (defs && typeof defs === 'object') {
        const names: string[] = [];
        for (const val of Object.values(defs)) {
          const v = typeof val === 'string' ? extractVarName(val) : null;
          if (v) names.push(v);
        }
        if (names.length) completions[group] = names;
      }
    }
    return completions;
  }

  /**
   * Get resolved plugin paths.
   * @returns Array of plugin file paths.
   */
  async getPluginPaths(): Promise<string[]> {
    await this.pluginLoad;
    return this.pluginPaths;
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
    const unusedRules = enabled.filter(
      (e) => e.rule.name === 'design-system/no-unused-tokens',
    );
    if (unusedRules.length) {
      this.unusedTokenRules = unusedRules.map((u) => ({
        ruleId: u.rule.name,
        severity: u.severity,
        ignored: new Set(
          ((u.options as { ignore?: string[] }) || {}).ignore || [],
        ),
      }));
      this.trackTokenUsage(text);
    }
    const messages: LintResult['messages'] = [];
    const ruleDescriptions: Record<string, string> = {};
    const disabledLines = getDisabledLines(text);
    const listeners = enabled.map(({ rule, options, severity }) => {
      ruleDescriptions[rule.name] = rule.meta.description;
      const themes =
        options &&
        typeof options === 'object' &&
        options !== null &&
        Array.isArray((options as { themes?: unknown }).themes)
          ? ((options as { themes?: string[] }).themes as string[])
          : undefined;
      const tokens = mergeTokens(this.tokensByTheme, themes);
      const ctx: RuleContext = {
        filePath,
        tokens: tokens as DesignTokens,
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
          const decls = parseCSS(
            style.content,
            messages,
            style.lang as string | undefined,
          );
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
          const langAttr = (
            ast.css as unknown as {
              attributes?: Array<{
                name: string;
                value?: Array<{ data?: string }>;
              }>;
            }
          ).attributes?.find((a) => a.name === 'lang');
          const lang = langAttr?.value?.[0]?.data;
          const decls = parseCSS(styleText, messages, lang);
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
      const getRootTag = (expr: ts.LeftHandSideExpression): string | null => {
        if (ts.isIdentifier(expr)) return expr.text;
        if (
          ts.isPropertyAccessExpression(expr) ||
          ts.isElementAccessExpression(expr)
        ) {
          return getRootTag(expr.expression as ts.LeftHandSideExpression);
        }
        if (ts.isCallExpression(expr)) {
          return getRootTag(expr.expression as ts.LeftHandSideExpression);
        }
        return null;
      };

      const visit = (node: ts.Node) => {
        for (const l of listeners) l.onNode?.(node);
        if (
          ts.isJsxAttribute(node) &&
          node.name.getText() === 'style' &&
          node.initializer &&
          ts.isStringLiteral(node.initializer)
        ) {
          const init = node.initializer;
          const start = source.getLineAndCharacterOfPosition(
            init.getStart(source) + 1,
          );
          const tempMessages: LintMessage[] = [];
          const decls = parseCSS(init.text, tempMessages);
          for (const decl of decls) {
            const line = start.line + decl.line - 1;
            const column =
              decl.line === 1 ? start.character + decl.column - 1 : decl.column;
            for (const l of listeners)
              l.onCSSDeclaration?.({ ...decl, line, column });
          }
          for (const m of tempMessages) {
            const line = start.line + m.line - 1;
            const column =
              m.line === 1 ? start.character + m.column - 1 : m.column;
            messages.push({ ...m, line, column });
          }
          return;
        } else if (ts.isTaggedTemplateExpression(node)) {
          const root = getRootTag(node.tag as ts.LeftHandSideExpression);
          if (
            root &&
            ['styled', 'css', 'tw'].includes(root) &&
            ts.isNoSubstitutionTemplateLiteral(node.template)
          ) {
            const tpl = node.template;
            const start = source.getLineAndCharacterOfPosition(
              tpl.getStart(source) + 1,
            );
            const tempMessages: LintMessage[] = [];
            const decls = parseCSS(tpl.text, tempMessages);
            for (const decl of decls) {
              const line = start.line + decl.line - 1;
              const column =
                decl.line === 1
                  ? start.character + decl.column - 1
                  : decl.column;
              for (const l of listeners)
                l.onCSSDeclaration?.({ ...decl, line, column });
            }
            for (const m of tempMessages) {
              const line = start.line + m.line - 1;
              const column =
                m.line === 1 ? start.character + m.column - 1 : m.column;
              messages.push({ ...m, line, column });
            }
            return;
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    } else if (/\.(?:css|scss|sass|less)$/.test(filePath)) {
      let syntax: string | undefined;
      if (/\.s[ac]ss$/i.test(filePath)) syntax = 'scss';
      else if (/\.less$/i.test(filePath)) syntax = 'less';
      const decls = parseCSS(text, messages, syntax);
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

  private trackTokenUsage(text: string): void {
    for (const token of this.allTokenValues) {
      if (this.usedTokenValues.has(token)) continue;
      if (token.includes('--') || token.startsWith('-')) {
        if (text.includes(`var(${token})`) || text.includes(token)) {
          this.usedTokenValues.add(token);
        }
      } else if (token.startsWith('#')) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes(token.toLowerCase())) {
          this.usedTokenValues.add(token);
        }
      } else if (/^\d/.test(token)) {
        const re = new RegExp(
          `\\b${token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`,
        );
        if (re.test(text)) this.usedTokenValues.add(token);
      } else {
        if (text.includes(token)) this.usedTokenValues.add(token);
      }
    }
  }
}

function collectTokenValues(tokens?: DesignTokens): Set<string> {
  const values = new Set<string>();
  if (!tokens) return values;
  for (const [group, defs] of Object.entries(tokens)) {
    if (group === 'deprecations') continue;
    if (Array.isArray(defs)) {
      for (const t of defs) {
        if (typeof t === 'string' && !t.includes('*')) values.add(t);
      }
    } else if (defs && typeof defs === 'object') {
      for (const val of Object.values(defs as Record<string, unknown>)) {
        if (typeof val === 'string') {
          const m = val.match(/^var\((--[^)]+)\)$/);
          values.add(m ? m[1] : val);
        } else if (typeof val === 'number') {
          values.add(String(val));
        }
      }
    }
  }
  return values;
}

function parseCSS(
  text: string,
  messages: LintMessage[] = [],
  lang?: string,
): CSSDeclaration[] {
  const decls: CSSDeclaration[] = [];
  try {
    const root: postcss.Root =
      lang === 'scss' || lang === 'sass'
        ? postcssScss.parse(text)
        : lang === 'less'
          ? postcssLess.parse(text)
          : postcss.parse(text);
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
    if (/(?:\/\/|\/\*)\s*design-lint-disable-next-line/.test(line)) {
      disabled.add(i + 2);
      continue;
    }
    if (/design-lint-disable-line/.test(line)) {
      disabled.add(i + 1);
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
