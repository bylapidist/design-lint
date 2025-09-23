import type {
  DesignTokens,
  DtifFlattenedToken,
  FlattenedToken,
  JsonPointer,
} from './types.js';
import {
  flattenDesignTokens,
  normalizePath,
  type NameTransform,
} from '../utils/tokens/index.js';
import { getDtifFlattenedTokens } from '../utils/tokens/dtif-cache.js';
import { DtifTokenRegistry } from './dtif/token-registry.js';
import { toLegacyFlattenedToken } from './dtif/legacy-adapter.js';

export interface TokenRegistryOptions {
  nameTransform?: NameTransform;
  onWarn?: (msg: string) => void;
}

/**
 * Registry for flattened design tokens keyed by theme and normalized path.
 *
 * Provides lookup and aggregation utilities used by the linter and generators.
 */
export class TokenRegistry {
  private legacyTokens = new Map<string, Map<string, FlattenedToken>>();
  private transform?: NameTransform;
  private dtifRegistry?: DtifTokenRegistry;
  private dtifCache = new WeakMap<DtifFlattenedToken, FlattenedToken>();

  /**
   * Create a token registry from a record of theme token objects.
   *
   * @param tokensByTheme - Mapping of theme names to design tokens.
   * @param options - Optional configuration controlling name transforms and warnings.
   */
  constructor(
    tokensByTheme: Record<string, DesignTokens | readonly DtifFlattenedToken[]>,
    options?: TokenRegistryOptions,
  ) {
    this.transform = options?.nameTransform;
    const dtifTokensByTheme: Record<string, readonly DtifFlattenedToken[]> = {};
    for (const [theme, tokens] of Object.entries(tokensByTheme)) {
      if (theme.startsWith('$')) continue;
      const dtifTokens = toDtifFlattenedTokens(tokens, theme);
      if (dtifTokens) {
        dtifTokensByTheme[theme] = dtifTokens;
        continue;
      }
      const warn = options?.onWarn;
      const map = new Map<string, FlattenedToken>();
      for (const token of flattenDesignTokens(tokens, {
        nameTransform: this.transform,
        onWarn: warn,
      })) {
        map.set(token.path, token);
      }
      if (map.size > 0) {
        this.legacyTokens.set(theme, map);
      }
    }

    if (Object.keys(dtifTokensByTheme).length > 0) {
      this.dtifRegistry = new DtifTokenRegistry(dtifTokensByTheme, {
        nameTransform: this.transform,
      });
    }
  }

  /**
   * Retrieve a flattened token by name and optional theme.
   *
   * @param name - Token path to locate.
   * @param theme - Theme name to query; searches all themes when omitted.
   * @returns The matching token or `undefined` if none exists.
   */
  getToken(name: string, theme?: string): FlattenedToken | undefined {
    const dtifToken = this.dtifRegistry?.getByName(name, theme);
    if (dtifToken) {
      return this.toLegacyToken(dtifToken);
    }
    const key = normalizePath(name, this.transform);
    if (theme) return this.legacyTokens.get(theme)?.get(key);
    if (this.legacyTokens.has('default')) {
      const def = this.legacyTokens.get('default')?.get(key);
      if (def) return def;
    }
    for (const map of this.legacyTokens.values()) {
      const token = map.get(key);
      if (token) return token;
    }
    return undefined;
  }

  /**
   * Retrieve all tokens for a theme or deduplicated across themes.
   *
   * @param theme - Theme name to filter by; when omitted, tokens from all themes are merged.
   * @returns Array of flattened tokens.
   */
  getTokens(theme?: string): FlattenedToken[] {
    const seen = new Map<string, FlattenedToken>();
    if (theme) {
      if (this.dtifRegistry) {
        for (const token of this.dtifRegistry.getTokens(theme)) {
          const legacy = this.toLegacyToken(token);
          if (!seen.has(legacy.path)) {
            seen.set(legacy.path, legacy);
          }
        }
      }
      const legacyTokens = this.legacyTokens.get(theme);
      if (legacyTokens) {
        for (const [path, token] of legacyTokens) {
          if (!seen.has(path)) {
            seen.set(path, token);
          }
        }
      }
      return Array.from(seen.values());
    }

    if (this.dtifRegistry) {
      for (const token of this.dtifRegistry.getTokens()) {
        const legacy = this.toLegacyToken(token);
        if (!seen.has(legacy.path)) {
          seen.set(legacy.path, legacy);
        }
      }
    }

    for (const map of this.legacyTokens.values()) {
      for (const [path, token] of map) {
        if (!seen.has(path)) seen.set(path, token);
      }
    }
    return Array.from(seen.values());
  }

  getDtifTokenByPointer(
    pointer: JsonPointer,
    theme?: string,
  ): DtifFlattenedToken | undefined {
    return this.dtifRegistry?.getByPointer(pointer, theme);
  }

  getDtifTokenByName(
    name: string,
    theme?: string,
  ): DtifFlattenedToken | undefined {
    return this.dtifRegistry?.getByName(name, theme);
  }

  getDtifTokens(theme?: string): DtifFlattenedToken[] {
    return this.dtifRegistry?.getTokens(theme) ?? [];
  }

  private toLegacyToken(token: DtifFlattenedToken): FlattenedToken {
    const cached = this.dtifCache.get(token);
    if (cached) {
      return cached;
    }
    const legacy = toLegacyFlattenedToken(token);
    const transformed = applyNameTransform(legacy, this.transform);
    this.dtifCache.set(token, transformed);
    return transformed;
  }
}

function toDtifFlattenedTokens(
  tokens: DesignTokens | readonly DtifFlattenedToken[],
  theme: string,
): readonly DtifFlattenedToken[] | undefined {
  if (isDtifFlattenedTokenArray(tokens)) {
    return tokens;
  }

  const cached = getDtifFlattenedTokens(tokens);
  if (cached !== undefined) {
    return cached;
  }

  if (isDtifDocument(tokens)) {
    throw new Error(
      `Missing cached DTIF tokens for theme "${theme}". ` +
        'Call ensureDtifFlattenedTokens or normalizeTokens before constructing a TokenRegistry.',
    );
  }

  return undefined;
}

function isDtifFlattenedTokenArray(
  tokens: DesignTokens | readonly DtifFlattenedToken[],
): tokens is readonly DtifFlattenedToken[] {
  return Array.isArray(tokens) && tokens.every(isDtifFlattenedTokenLike);
}

function isDtifFlattenedTokenLike(
  value: unknown,
): value is { pointer: string } {
  if (!hasPointerProperty(value)) {
    return false;
  }
  return typeof value.pointer === 'string';
}

function hasPointerProperty(value: unknown): value is { pointer: unknown } {
  return typeof value === 'object' && value !== null && 'pointer' in value;
}

function isDtifDocument(value: unknown): value is DesignTokens {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(value, '$version');
}

function applyNameTransform(
  token: FlattenedToken,
  transform?: NameTransform,
): FlattenedToken {
  const path = normalizePath(token.path, transform);
  const aliases = token.aliases?.map((alias) =>
    normalizePath(alias, transform),
  );
  return aliases ? { ...token, path, aliases } : { ...token, path };
}
