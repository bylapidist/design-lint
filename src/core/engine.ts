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
} from './types';
import { builtInRules } from '../rules';

export interface Config {
  tokens?: DesignTokens;
  rules?: Record<string, unknown>;
  ignoreFiles?: string[];
  plugins?: string[];
}

export class Linter {
  private config: Config;
  private ruleMap: Map<string, RuleModule> = new Map();

  constructor(config: Config) {
    this.config = config;
    for (const rule of builtInRules) {
      this.ruleMap.set(rule.name, rule);
    }
  }

  async lintFiles(targets: string[]): Promise<LintResult[]> {
    const files: string[] = [];
    for (const t of targets) {
      const full = path.resolve(t);
      if (!fs.existsSync(full)) continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full, (p) => files.push(p));
      } else {
        files.push(full);
      }
    }
    const filtered = files.filter(
      (f) =>
        !isIgnored(
          path.relative(process.cwd(), f),
          this.config.ignoreFiles || [],
        ),
    );
    const results: LintResult[] = [];
    for (const filePath of filtered) {
      const text = fs.readFileSync(filePath, 'utf8');
      results.push(await this.lintText(text, filePath));
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

    if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
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

function walk(dir: string, cb: (file: string) => void) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, cb);
    } else if (/\.(ts|tsx|js|jsx|css)$/.test(full)) {
      cb(full);
    }
  }
}

function isIgnored(relPath: string, patterns: string[]): boolean {
  return patterns.some((p) => globToRegExp(p).test(relPath));
}

function globToRegExp(pattern: string): RegExp {
  let regex = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  regex = regex.replace(/\*\*/g, '.*');
  regex = regex.replace(/\*/g, '[^/]*');
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
