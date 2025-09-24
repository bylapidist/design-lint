import type { LintResult, DesignTokens, DtifFlattenedToken } from './types.js';
import type { TokenProvider } from './environment.js';
import { guards, collections } from '../utils/index.js';
import { extractVarName } from '../utils/tokens/index.js';
import { getTokenPath } from '../utils/tokens/token-view.js';
import {
  ensureDtifFlattenedTokens,
  getDtifFlattenedTokens,
} from '../utils/tokens/dtif-cache.js';

const {
  data: { isRecord },
  domain: { isDesignTokens },
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

interface TrackedTokenInfo {
  token: DtifFlattenedToken;
  path: string;
}

export class TokenTracker {
  private allTokenValues = new Map<string, TrackedTokenInfo>();
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
    if (tokens) {
      await Promise.all(
        Object.entries(tokens).map(async ([theme, doc]) => {
          if (theme.startsWith('$')) return;
          if (isDesignTokens(doc)) {
            await ensureDtifFlattenedTokens(doc, {
              uri: `memory://token-tracker/${encodeURIComponent(theme)}.json`,
            });
          }
        }),
      );
    }
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
              pointer: info.token.pointer,
              deprecated: info.token.metadata.deprecated,
              extensions: info.token.metadata.extensions,
            },
          })),
        });
      }
    }
    return results;
  }
}

function collectTokenValues(
  tokensByTheme?: Record<string, DesignTokens | readonly DtifFlattenedToken[]>,
): Map<string, TrackedTokenInfo> {
  const values = new Map<string, TrackedTokenInfo>();
  if (!tokensByTheme) return values;
  for (const [theme, tokens] of Object.entries(tokensByTheme)) {
    if (theme.startsWith('$')) continue;
    const dtifTokens = resolveDtifTokens(tokens);
    if (!dtifTokens) continue;
    for (const token of dtifTokens) {
      const key = toTrackedValue(token.value);
      if (!key) continue;
      if (!values.has(key)) {
        values.set(key, { token, path: getTokenPath(token) });
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

function resolveDtifTokens(
  tokens: DesignTokens | readonly DtifFlattenedToken[],
): readonly DtifFlattenedToken[] | undefined {
  if (Array.isArray(tokens) && tokens.every(isDtifFlattenedTokenLike)) {
    return tokens;
  }
  if (isDesignTokens(tokens)) {
    return getDtifFlattenedTokens(tokens);
  }
  return undefined;
}

function toTrackedValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    if (value.includes('*')) {
      return undefined;
    }
    const name = extractVarName(value);
    return name ?? value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (isValueWithUnit(value)) {
    return `${String(value.value)}${value.unit}`;
  }
  return undefined;
}

function isDtifFlattenedTokenLike(value: unknown): value is DtifFlattenedToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'pointer') === 'string'
  );
}
