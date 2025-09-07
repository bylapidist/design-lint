import type { DesignTokens, LintResult } from './types.js';

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
      options: unknown;
      severity: 'error' | 'warn';
    }[],
  ): void {
    const unusedRules = rules.filter(
      (e) => e.rule.name === 'design-system/no-unused-tokens',
    );
    this.unusedTokenRules = unusedRules.map((u) => ({
      ruleId: u.rule.name,
      severity: u.severity,
      ignored: new Set(
        ((u.options as { ignore?: string[] }) || {}).ignore || [],
      ),
    }));
  }

  hasUnusedTokenRules(): boolean {
    return this.unusedTokenRules.length > 0;
  }

  trackUsage(text: string): void {
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
