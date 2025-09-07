import type { DesignTokens, LintResult } from './types.js';

type TokenType = 'cssVar' | 'hexColor' | 'numeric' | 'string';

const classifiers: Record<TokenType, (token: string, text: string) => boolean> =
  {
    cssVar: (token, text) =>
      text.includes(`var(${token})`) || text.includes(token),
    hexColor: (token, text) => text.toLowerCase().includes(token.toLowerCase()),
    numeric: (token, text) =>
      new RegExp(`\\b${escapeRegExp(token)}\\b`).test(text),
    string: (token, text) => text.includes(token),
  };

function getTokenType(token: string): TokenType {
  if (token.includes('--') || token.startsWith('-')) return 'cssVar';
  if (token.startsWith('#')) return 'hexColor';
  if (/^\d/.test(token)) return 'numeric';
  return 'string';
}

function escapeRegExp(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

interface UnusedRuleConfig {
  ruleId: string;
  severity: 'error' | 'warn';
  ignored: Set<string>;
}

export class TokenTracker {
  private allTokenValues = new Set<string>();
  private usedTokenValues = new Set<string>();
  private unusedTokenRules: UnusedRuleConfig[] = [];

  constructor(tokens?: DesignTokens) {
    this.allTokenValues = collectTokenValues(tokens);
  }

  configure(
    rules: {
      rule: { name: string };
      options?: unknown;
      severity: 'error' | 'warn';
    }[],
  ): void {
    const unusedRules = rules.filter(isUnusedTokenRule);
    this.unusedTokenRules = unusedRules.map((u) => ({
      ruleId: u.rule.name,
      severity: u.severity,
      ignored: new Set(u.options?.ignore ?? []),
    }));
  }

  hasUnusedTokenRules(): boolean {
    return this.unusedTokenRules.length > 0;
  }

  trackUsage(text: string): void {
    for (const token of this.allTokenValues) {
      if (this.usedTokenValues.has(token)) continue;
      const tokenType = getTokenType(token);
      if (classifiers[tokenType](token, text)) {
        this.usedTokenValues.add(token);
      }
    }
  }

  generateReports(configPath: string): LintResult[] {
    const results: LintResult[] = [];
    for (const { ruleId, severity, ignored } of this.unusedTokenRules) {
      const unused = Array.from(this.allTokenValues).filter(
        (t) => !this.usedTokenValues.has(t) && !ignored.has(t),
      );
      if (unused.length) {
        results.push({
          filePath: configPath,
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
    return results;
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
    } else if (isRecord(defs)) {
      for (const val of Object.values(defs)) {
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

function isUnusedTokenRule(e: {
  rule: { name: string };
  options?: unknown;
  severity: 'error' | 'warn';
}): e is {
  rule: { name: 'design-system/no-unused-tokens' };
  options?: { ignore?: string[] };
  severity: 'error' | 'warn';
} {
  if (e.rule.name !== 'design-system/no-unused-tokens') return false;
  if (!isRecord(e.options)) return true;
  return (
    e.options.ignore === undefined ||
    (Array.isArray(e.options.ignore) &&
      e.options.ignore.every((t): t is string => typeof t === 'string'))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
