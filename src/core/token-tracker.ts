import type { LintResult, DesignTokens, FlattenedToken } from './types.js';
import type { TokenProvider } from './environment.js';
import { guards, collections } from '../utils/index.js';
import { getFlattenedTokens, extractVarName } from '../utils/tokens/index.js';

const {
  data: { isRecord },
} = guards;
const { isArray } = collections;

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
  private allTokenValues = new Map<string, FlattenedToken>();
  private usedTokenValues = new Set<string>();
  private unusedTokenRules: UnusedRuleConfig[] = [];
  private provider?: TokenProvider;
  private loaded = false;

  constructor(provider?: TokenProvider) {
    this.provider = provider;
  }

  private async loadTokens(): Promise<void> {
    if (this.loaded) return;
    const tokens = await this.provider?.load();
    this.allTokenValues = collectTokenValues(tokens);
    this.loaded = true;
  }

  async configure(
    rules: {
      rule: { name: string };
      options?: unknown;
      severity: 'error' | 'warn';
    }[],
  ): Promise<void> {
    await this.loadTokens();
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

  async trackUsage(text: string): Promise<void> {
    await this.loadTokens();
    for (const token of this.allTokenValues.keys()) {
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
      const unused = Array.from(this.allTokenValues.entries()).filter(
        ([value]) => !this.usedTokenValues.has(value) && !ignored.has(value),
      );
      if (unused.length) {
        results.push({
          sourceId: configPath,
          messages: unused.map(([value, info]) => ({
            ruleId,
            message: `Token ${value} is defined but never used`,
            severity,
            line: 1,
            column: 1,
            metadata: {
              path: info.path,
              deprecated: info.metadata.deprecated,
              extensions: info.metadata.extensions,
            },
          })),
        });
      }
    }
    return results;
  }
}

function collectTokenValues(
  tokensByTheme?: Record<string, DesignTokens>,
): Map<string, FlattenedToken> {
  const values = new Map<string, FlattenedToken>();
  if (!tokensByTheme) return values;
  for (const theme of Object.keys(tokensByTheme)) {
    if (theme.startsWith('$')) continue;
    for (const flat of getFlattenedTokens(tokensByTheme, theme)) {
      const val = flat.value;
      if (typeof val === 'string') {
        if (val.includes('*')) continue;
        const name = extractVarName(val);
        const key = name ?? val;
        if (!values.has(key)) values.set(key, flat);
        continue;
      }
      if (typeof val === 'number') {
        const key = String(val);
        if (!values.has(key)) values.set(key, flat);
        continue;
      }
      if (isValueWithUnit(val)) {
        const key = `${String(val.value)}${val.unit}`;
        if (!values.has(key)) values.set(key, flat);
        continue;
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
    (isArray(e.options.ignore) &&
      e.options.ignore.every((t): t is string => typeof t === 'string'))
  );
}

function isValueWithUnit(
  value: unknown,
): value is { value: number; unit: string } {
  return (
    isRecord(value) &&
    typeof Reflect.get(value, 'value') === 'number' &&
    typeof Reflect.get(value, 'unit') === 'string'
  );
}
