import type { DesignTokens, FlattenedToken } from './types.js';
import {
  flattenDesignTokens,
  normalizePath,
  type NameTransform,
} from '../utils/tokens/index.js';

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
  private tokens = new Map<string, Map<string, FlattenedToken>>();
  private transform?: NameTransform;

  /**
   * Create a token registry from a record of theme token objects.
   *
   * @param tokensByTheme - Mapping of theme names to design tokens.
   * @param options - Optional configuration controlling name transforms and warnings.
   */
  constructor(
    tokensByTheme: Record<string, DesignTokens>,
    options?: TokenRegistryOptions,
  ) {
    this.transform = options?.nameTransform;
    const warn = options?.onWarn;
    for (const [theme, tokens] of Object.entries(tokensByTheme)) {
      if (theme.startsWith('$')) continue;
      const map = new Map<string, FlattenedToken>();
      for (const token of flattenDesignTokens(tokens, {
        nameTransform: this.transform,
        onWarn: warn,
      })) {
        map.set(token.path, token);
      }
      this.tokens.set(theme, map);
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
    const key = normalizePath(name, this.transform);
    if (theme) return this.tokens.get(theme)?.get(key);
    if (this.tokens.has('default')) {
      const def = this.tokens.get('default')?.get(key);
      if (def) return def;
    }
    for (const map of this.tokens.values()) {
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
    if (theme) {
      return Array.from(this.tokens.get(theme)?.values() ?? []);
    }
    const seen = new Map<string, FlattenedToken>();
    for (const map of this.tokens.values()) {
      for (const [path, token] of map) {
        if (!seen.has(path)) seen.set(path, token);
      }
    }
    return Array.from(seen.values());
  }
}
