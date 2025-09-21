/**
 * @packageDocumentation
 *
 * Helpers for flattening design token objects and aggregating them across themes.
 */

import { parseDesignTokens } from '../../core/parser/index.js';
import type { DesignTokens, FlattenedToken } from '../../core/types.js';
import { normalizePath, type NameTransform } from './path.js';
import { isPointerFragment } from './pointer.js';

export interface FlattenOptions {
  /** Optional transform applied to each path segment */
  nameTransform?: NameTransform;
  /** Warning callback for parse or alias issues */
  onWarn?: (msg: string) => void;
}

/**
 * Flatten a nested design token object into an array of tokens.
 *
 * @param tokens - Nested design token structure.
 * @param options - Optional normalization settings.
 * @returns Array of flattened tokens including metadata and resolved aliases.
 */
export function flattenDesignTokens(
  tokens: DesignTokens,
  options?: FlattenOptions,
): FlattenedToken[] {
  const flat = parseDesignTokens(tokens, undefined, {
    onWarn: options?.onWarn,
  });
  const transform = options?.nameTransform;
  return flat.map(({ path, aliases, ...rest }) => ({
    ...rest,
    path: normalizePath(path, transform),
    ...(aliases
      ? {
          aliases: aliases.map((alias) =>
            isPointerFragment(alias) ? alias : normalizePath(alias, transform),
          ),
        }
      : {}),
  }));
}

/**
 * Collect flattened tokens from a set of themes with optional aggregation.
 *
 * @param tokensByTheme - Record of theme names to token objects.
 * @param theme - Specific theme to flatten; when omitted all themes are merged.
 * @param options - Optional normalization settings.
 * @returns Array of flattened tokens.
 */
export function getFlattenedTokens(
  tokensByTheme: Record<string, DesignTokens>,
  theme?: string,
  options?: FlattenOptions,
): FlattenedToken[] {
  const transform = options?.nameTransform;
  const warn = options?.onWarn;
  if (theme) {
    if (Object.prototype.hasOwnProperty.call(tokensByTheme, theme)) {
      return flattenDesignTokens(tokensByTheme[theme], {
        nameTransform: transform,
        onWarn: warn,
      });
    }
    return [];
  }
  const seen = new Map<string, FlattenedToken>();
  for (const tokens of Object.values(tokensByTheme)) {
    for (const flat of flattenDesignTokens(tokens, {
      nameTransform: transform,
      onWarn: warn,
    })) {
      if (!seen.has(flat.path)) {
        seen.set(flat.path, flat);
      }
    }
  }
  return [...seen.values()];
}
