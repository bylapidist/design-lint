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

interface UnusedRuleConfig {
  enabled: boolean;
}

interface TrackedTokenInfo {
  token: DtifFlattenedToken;
  theme: string;
  path: string;
  value: string;
  identities: Set<string>;
}

export class TokenTracker {
  private allTokens = new Map<string, TrackedTokenInfo>();
  private tokenKeysByIdentity = new Map<string, Set<string>>();
  private usedTokenKeys = new Set<string>();
  private tracking: UnusedRuleConfig = { enabled: false };
  private provider?: TokenProvider;
  private loaded = false;

  constructor(provider?: TokenProvider) {
    this.provider = provider;
  }

  beginRun(): void {
    this.usedTokenKeys.clear();
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
    this.allTokens = collectTokens(tokens);
    this.tokenKeysByIdentity = indexTokenKeysByIdentity(this.allTokens);
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
    void input.text;
    await this.loadTokens();
    const identities = normalizeUsageCandidateIdentities(input.references);
    if (!identities) {
      return;
    }
    for (const identity of identities) {
      const tokenKeys = this.tokenKeysByIdentity.get(identity);
      if (!tokenKeys) continue;
      for (const key of tokenKeys) {
        this.usedTokenKeys.add(key);
      }
    }
  }

  async getUnusedTokens(
    ignored: readonly string[] = [],
  ): Promise<UnusedToken[]> {
    await this.loadTokens();
    const ignoredValues = new Set(ignored);
    return Array.from(this.allTokens.entries())
      .filter(
        ([key, info]) =>
          !this.usedTokenKeys.has(key) && !ignoredValues.has(info.value),
      )
      .map(([, info]) => ({
        value: info.value,
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

function indexTokenKeysByIdentity(
  values: Map<string, TrackedTokenInfo>,
): Map<string, Set<string>> {
  const indexed = new Map<string, Set<string>>();
  for (const [tokenKey, info] of values.entries()) {
    for (const identity of info.identities) {
      const mapped = indexed.get(identity);
      if (mapped) {
        mapped.add(tokenKey);
      } else {
        indexed.set(identity, new Set([tokenKey]));
      }
    }
  }
  return indexed;
}

function collectTokens(
  tokensByTheme?: Record<string, DesignTokens | readonly DtifFlattenedToken[]>,
): Map<string, TrackedTokenInfo> {
  const values = new Map<string, TrackedTokenInfo>();
  if (!tokensByTheme) return values;
  for (const [theme, tokens] of Object.entries(tokensByTheme)) {
    if (theme.startsWith('$')) continue;
    const dtifTokens = resolveDtifTokens(tokens);
    if (!dtifTokens) continue;
    for (const token of dtifTokens) {
      const key = toTokenKey(theme, token.pointer);
      const identities = collectTokenIdentities(token);
      values.set(key, {
        token,
        theme,
        path: getTokenPath(token),
        value: toDisplayValue(token),
        identities,
      });
    }
  }
  return values;
}

function collectTokenIdentities(token: DtifFlattenedToken): Set<string> {
  const identities = new Set<string>();
  identities.add(token.pointer);
  identities.add(getTokenPath(token));
  const scalarValue = toTrackedScalarValue(token.value);
  if (scalarValue) {
    identities.add(scalarValue);
  }
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
  return toTrackedScalarValue(value);
}

function toTrackedScalarValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
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

function toDisplayValue(token: DtifFlattenedToken): string {
  const trackedValue = toTrackedValue(token.value);
  if (trackedValue) return trackedValue;
  return getTokenPath(token);
}

function toTokenKey(theme: string, pointer: string): string {
  return `${theme}:${pointer}`;
}

function isDtifFlattenedTokenLike(value: unknown): value is DtifFlattenedToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'pointer') === 'string'
  );
}
