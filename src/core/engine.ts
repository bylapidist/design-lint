import { promises as fs } from 'fs';
import path from 'path';
import ts from 'typescript';
import postcss from 'postcss';
import { createRequire } from 'module';
import fg from 'fast-glob';
import ignore from 'ignore';
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
          throw new Error(
            `Failed to load plugin "${p}": ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
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
        throw new Error(
          `Invalid plugin "${p}": expected { rules: RuleModule[] }`,
        );
      }
      for (const rule of plugin.rules) {
        this.ruleMap.set(rule.name, rule);
      }
    }
  }

  async lintFiles(targets: string[], fix = false): Promise<LintResult[]> {
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
    ig.add(ignorePatterns.map((p) => p.replace(/\\/g, '/')));

    const files: string[] = [];
    for (const t of targets) {
      const full = path.resolve(t);
      try {
        const stat = await fs.stat(full);
        if (stat.isDirectory()) {
          const entries = await fg(
            '**/*.{ts,tsx,js,jsx,css,svelte,vue}',
            { cwd: full, absolute: true, dot: true },
          );
          files.push(...entries);
        } else {
          files.push(full);
        }
      } catch {
        // skip missing files
      }
    }

    const relFiles = files.map((f) =>
      path.relative(process.cwd(), f).replace(/\\/g, '/'),
    );
    const filteredRel = ig.filter(relFiles);
    const filtered = filteredRel.map((r) => path.resolve(process.cwd(), r));

    const results: LintResult[] = [];
    for (const filePath of filtered) {
      const text = await fs.readFile(filePath, 'utf8');
      let result = await this.lintText(text, filePath);
      if (fix) {
        const output = applyFixes(text, result.messages);
        if (output !== text) {
          await fs.writeFile(filePath, output, 'utf8');
          result = await this.lintText(output, filePath);
        }
      }
      results.push(result);
    }
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

    if (/\.svelte$/.test(filePath) || /\.vue$/.test(filePath)) {
      const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      const styleMatch = text.match(/<style[^>]*>([\s\S]*?)<\/style>/);
      const template = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/, '')
        .trim();

      const scriptContent = scriptMatch ? scriptMatch[1] : '';
      const templateTsx = template
        .replace(/class=/g, 'className=')
        .replace(
          filePath.endsWith('.svelte')
            ? /style="padding: {([^}]+)}px"/g
            : /:style="{([^}]+)}"/g,
          (_, expr) => `style={{ ${expr.trim()} }}`,
        );
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
      if (styleMatch) {
        const decls = parseCSS(styleMatch[1]);
        for (const decl of decls) {
          for (const l of listeners) l.onCSSDeclaration?.(decl);
        }
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
      const decls = parseCSS(text);
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

function parseCSS(text: string): CSSDeclaration[] {
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
  } catch {
    // ignore parse errors and return what we have
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
