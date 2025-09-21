import type { DesignTokens, FlattenedToken } from './types.js';
import {
  flattenDesignTokens,
  isPointerFragment,
  normalizePath,
  type NameTransform,
} from '../utils/tokens/index.js';

export interface TokenRegistryOptions {
  nameTransform?: NameTransform;
  onWarn?: (msg: string) => void;
}

interface ThemeTokenIndex {
  byPath: Map<string, FlattenedToken>;
  byPointer: Map<string, FlattenedToken>;
}

function extractPointerFragment(identifier: string): string | undefined {
  const hashIndex = identifier.indexOf('#');
  if (hashIndex === -1) {
    return undefined;
  }
  const fragment = identifier.slice(hashIndex);
  return isPointerFragment(fragment) ? fragment : undefined;
}

/**
 * Registry for flattened design tokens keyed by theme and normalized path.
 *
 * Provides lookup and aggregation utilities used by the linter and generators.
 */
export class TokenRegistry {
  private tokens = new Map<string, ThemeTokenIndex>();
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
      const index: ThemeTokenIndex = {
        byPath: new Map<string, FlattenedToken>(),
        byPointer: new Map<string, FlattenedToken>(),
      };
      for (const token of flattenDesignTokens(tokens, {
        nameTransform: this.transform,
        onWarn: warn,
      })) {
        index.byPath.set(token.path, token);
        index.byPointer.set(token.pointer, token);
      }
      this.tokens.set(theme, index);
    }
  }

  private getThemeOrder(theme?: string): ThemeTokenIndex[] {
    if (theme) {
      const index = this.tokens.get(theme);
      return index ? [index] : [];
    }
    const ordered: ThemeTokenIndex[] = [];
    const defaultIndex = this.tokens.get('default');
    if (defaultIndex) {
      ordered.push(defaultIndex);
    }
    for (const [themeName, index] of this.tokens) {
      if (themeName === 'default') continue;
      ordered.push(index);
    }
    return ordered;
  }

  private lookupByPointer(
    pointer: string,
    theme?: string,
  ): FlattenedToken | undefined {
    for (const index of this.getThemeOrder(theme)) {
      const match = index.byPointer.get(pointer);
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  private lookupByPath(
    path: string,
    theme?: string,
  ): FlattenedToken | undefined {
    for (const index of this.getThemeOrder(theme)) {
      const match = index.byPath.get(path);
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  /**
   * Retrieve a flattened token by name and optional theme.
   *
   * @param name - Token path to locate.
   * @param theme - Theme name to query; searches all themes when omitted.
   * @returns The matching token or `undefined` if none exists.
   */
  getToken(name: string, theme?: string): FlattenedToken | undefined {
    const pointer = extractPointerFragment(name);
    if (pointer) {
      const match = this.lookupByPointer(pointer, theme);
      if (match) {
        return match;
      }
    }
    const key = normalizePath(name, this.transform);
    return this.lookupByPath(key, theme);
  }

  /**
   * Retrieve a flattened token by JSON Pointer fragment.
   *
   * @param pointer - Token pointer (e.g. `#/color/brand`).
   * @param theme - Theme name to query; searches all themes when omitted.
   * @returns The matching token or `undefined` if none exists.
   */
  getTokenByPointer(
    pointer: string,
    theme?: string,
  ): FlattenedToken | undefined {
    const fragment = extractPointerFragment(pointer);
    if (!fragment) {
      throw new Error(
        `Token pointer must be a valid JSON Pointer fragment: ${pointer}`,
      );
    }
    return this.lookupByPointer(fragment, theme);
  }

  /**
   * Retrieve all tokens for a theme or deduplicated across themes.
   *
   * @param theme - Theme name to filter by; when omitted, tokens from all themes are merged.
   * @returns Array of flattened tokens.
   */
  getTokens(theme?: string): FlattenedToken[] {
    if (theme) {
      return Array.from(this.tokens.get(theme)?.byPath.values() ?? []);
    }
    const seen = new Map<string, FlattenedToken>();
    for (const index of this.getThemeOrder()) {
      for (const [path, token] of index.byPath) {
        if (!seen.has(path)) seen.set(path, token);
      }
    }
    return Array.from(seen.values());
  }
}
