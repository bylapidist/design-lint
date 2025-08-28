import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import type {
  LintResult,
  RuleModule,
  RuleContext,
  LintMessage,
  DesignTokens,
  CSSDeclaration,
  Fix,
} from './types';
import { builtInRules } from '../rules';

export interface Config {
  tokens?: DesignTokens;
  rules?: Record<string, unknown>;
  ignoreFiles?: string[];
  plugins?: string[];
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

  constructor(config: Config) {
    this.config = config;
    for (const rule of builtInRules) {
      this.ruleMap.set(rule.name, rule);
    }
  }

  async lintFiles(targets: string[], fix = false): Promise<LintResult[]> {
    const ignorePatterns = [...defaultIgnore];
    const ignoreFile = path.join(process.cwd(), '.designlintignore');
    if (fs.existsSync(ignoreFile)) {
      const lines = fs
        .readFileSync(ignoreFile, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      ignorePatterns.push(...lines);
    }
    if (this.config.ignoreFiles)
      ignorePatterns.push(...this.config.ignoreFiles);

    const files: string[] = [];
    for (const t of targets) {
      const full = path.resolve(t);
      if (!fs.existsSync(full)) continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full, (p) => files.push(p), ignorePatterns);
      } else {
        files.push(full);
      }
    }
    const filtered = files.filter(
      (f) => !isIgnored(path.relative(process.cwd(), f), ignorePatterns),
    );
    const results: LintResult[] = [];
    for (const filePath of filtered) {
      const text = fs.readFileSync(filePath, 'utf8');
      let result = await this.lintText(text, filePath);
      if (fix) {
        const output = applyFixes(text, result.messages);
        if (output !== text) {
          fs.writeFileSync(filePath, output, 'utf8');
          result = await this.lintText(output, filePath);
        }
      }
      results.push(result);
    }
    return results;
  }

  async lintText(text: string, filePath = 'unknown'): Promise<LintResult> {
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

function walk(dir: string, cb: (file: string) => void, ignores: string[]) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    const rel = path.relative(process.cwd(), full);
    if (stat.isDirectory()) {
      if (isIgnored(rel + '/', ignores)) continue;
      walk(full, cb, ignores);
    } else if (/\.(ts|tsx|js|jsx|css|svelte|vue)$/.test(full)) {
      if (isIgnored(rel, ignores)) continue;
      cb(full);
    }
  }
}

function isIgnored(relPath: string, patterns: string[]): boolean {
  let ignored = false;
  for (const raw of patterns) {
    const negated = raw.startsWith('!');
    const pattern = negated ? raw.slice(1) : raw;
    if (!pattern) continue;
    if (globToRegExp(pattern).test(relPath)) {
      ignored = !negated;
    }
  }
  return ignored;
}

function globToRegExp(pattern: string): RegExp {
  let regex = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  regex = regex.replace(/\*\*/g, '\0');
  regex = regex.replace(/\*/g, '[^/]*');
  regex = regex.replace(/\0/g, '.*');
  return new RegExp(`^${regex}$`);
}

function parseCSS(text: string): CSSDeclaration[] {
  const decls: CSSDeclaration[] = [];
  const lines = text.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regex = /([^:{}]+):\s*([^;]+);/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line))) {
      decls.push({
        prop: match[1].trim(),
        value: match[2].trim(),
        line: i + 1,
        column: match.index + 1,
      });
    }
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
