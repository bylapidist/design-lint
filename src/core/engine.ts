import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import ts from 'typescript';
import safeParser from 'postcss-safe-parser';
import type {
  LintResult,
  RuleModule,
  RuleContext,
  LintMessage,
  DesignTokens,
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

  async lintFiles(patterns: string[]): Promise<LintResult[]> {
    const expanded = patterns.map((p) => {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        return path.join(p, '**/*.{ts,tsx,js,jsx,css}');
      }
      return p;
    });
    const entries = await fg(expanded, {
      ignore: this.config.ignoreFiles,
      dot: false,
    });
    const results: LintResult[] = [];
    for (const filePath of entries) {
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
      const root = safeParser(text);
      root.walkDecls((decl) => {
        for (const l of listeners) l.onCSSDeclaration?.(decl);
      });
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
