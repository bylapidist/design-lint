import type { DesignTokens, FlattenedToken } from './types.js';
import {
  flattenDesignTokens,
  normalizePath,
  type NameTransform,
} from './token-utils.js';

export interface TokenRegistryOptions {
  nameTransform?: NameTransform;
  onWarn?: (msg: string) => void;
}

export class TokenRegistry {
  private tokens = new Map<string, Map<string, FlattenedToken>>();
  private transform?: NameTransform;

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
