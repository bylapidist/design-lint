import type {
  DesignTokens,
  DtifFlattenedToken,
  RuleModule,
  TokenReferenceCandidate,
  UnusedToken,
} from './types.js';
import type { TokenProvider } from './environment.js';
import { guards } from '../utils/index.js';
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
  enabled: boolean;
}

interface TrackedTokenInfo {
  token: DtifFlattenedToken;
  path: string;
  identities: Set<string>;
}

export class TokenTracker {
  private allTokenValues = new Map<string, TrackedTokenInfo>();
  private tokenValueByIdentity = new Map<string, Set<string>>();
  private usedTokenValues = new Set<string>();
  private tracking: UnusedRuleConfig = { enabled: false };
  private provider?: TokenProvider;
  private loaded = false;

  constructor(provider?: TokenProvider) {
    this.provider = provider;
  }

  beginRun(): void {
    this.usedTokenValues.clear();
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
    this.tokenValueByIdentity = indexTokenValuesByIdentity(this.allTokenValues);
    this.loaded = true;
  }

  async configure(
    rules: {
      rule: RuleModule;
      options?: unknown;
      severity: 'error' | 'warn';
    }[],
  ): Promise<void> {
    await this.loadTokens();
    this.tracking = {
      enabled: rules.some((entry) => entry.rule.meta.capabilities?.tokenUsage),
    };
  }

  hasTrackingConsumers(): boolean {
    return this.tracking.enabled;
  }

  async trackUsage(input: {
    text: string;
    references?: readonly TokenReferenceCandidate[];
  }): Promise<void> {
    await this.loadTokens();
    const identities = normalizeUsageCandidateIdentities(input.references);
    if (identities) {
      for (const identity of identities) {
        const tokenValues = this.tokenValueByIdentity.get(identity);
        if (!tokenValues) continue;
        for (const value of tokenValues) {
          this.usedTokenValues.add(value);
        }
      }
      return;
    }
    for (const tokenValue of this.allTokenValues.keys()) {
      const tokenType = getTokenType(tokenValue);
      if (classifiers[tokenType](tokenValue, input.text)) {
        this.usedTokenValues.add(tokenValue);
      }
    }
  }

  async getUnusedTokens(
    ignored: readonly string[] = [],
  ): Promise<UnusedToken[]> {
    await this.loadTokens();
    const ignoredValues = new Set(ignored);
    return Array.from(this.allTokenValues.entries())
      .filter(
        ([value]) =>
          !this.usedTokenValues.has(value) && !ignoredValues.has(value),
      )
      .map(([value, info]) => ({
        value,
        path: info.path,
        pointer: info.token.pointer,
        deprecated: info.token.metadata.deprecated,
        extensions: info.token.metadata.extensions,
      }));
  }
}

function normalizeUsageCandidateIdentities(
  references?: readonly TokenReferenceCandidate[],
): string[] | undefined {
  if (!references) return undefined;
  const identities = references
    .map((reference) => reference.identity.trim())
    .filter((identity) => identity.length > 0);
  return identities.length > 0 ? identities : undefined;
}

function indexTokenValuesByIdentity(
  values: Map<string, TrackedTokenInfo>,
): Map<string, Set<string>> {
  const indexed = new Map<string, Set<string>>();
  for (const [tokenValue, info] of values.entries()) {
    for (const identity of info.identities) {
      const mapped = indexed.get(identity);
      if (mapped) {
        mapped.add(tokenValue);
      } else {
        indexed.set(identity, new Set([tokenValue]));
      }
    }
  }
  return indexed;
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
      const identities = collectTokenIdentities(token);
      if (!values.has(key)) {
        values.set(key, { token, path: getTokenPath(token), identities });
        continue;
      }
      const existing = values.get(key);
      if (!existing) continue;
      for (const identity of identities) {
        existing.identities.add(identity);
      }
    }
  }
  return values;
}

function collectTokenIdentities(token: DtifFlattenedToken): Set<string> {
  const identities = new Set<string>();
  identities.add(token.pointer);
  identities.add(getTokenPath(token));
  if (typeof token.value === 'string') {
    const cssVar = extractVarName(token.value);
    if (cssVar) identities.add(cssVar);
  }
  for (const reference of token.resolution?.references ?? []) {
    identities.add(reference.pointer);
  }
  for (const pointer of token.resolution?.appliedAliases ?? []) {
    identities.add(pointer.pointer);
  }
  return identities;
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
