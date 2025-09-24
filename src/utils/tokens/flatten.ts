/**
 * @packageDocumentation
 *
 * Helpers for flattening design token objects and aggregating them across themes.
 */

import type { DesignTokens, DtifFlattenedToken } from '../../core/types.js';
import { getDtifFlattenedTokens } from './dtif-cache.js';
import { normalizePath, type NameTransform } from './path.js';

export interface FlattenOptions {
  /**
   * Optional transform applied to each path segment when normalizing derived
   * names. Consumers converting DTIF tokens to path-based views should reuse
   * the same transform to ensure consistent results.
   */
  nameTransform?: NameTransform;
}

/**
 * Flatten a nested design token object into an array of tokens.
 *
 * @param tokens - Nested design token structure.
 * @param options - Optional normalization settings.
 * @returns Array of flattened DTIF entries backed by the parser cache.
 */
export function flattenDesignTokens(
  tokens: DesignTokens | readonly DtifFlattenedToken[],
  _options?: FlattenOptions,
): readonly DtifFlattenedToken[] {
  if (_options?.nameTransform) {
    // Name transforms have no effect when flattening a single document.
  }
  if (isDtifFlattenedTokenArray(tokens)) {
    return tokens;
  }

  const cached = getDtifFlattenedTokens(tokens);
  if (cached !== undefined) {
    return cached;
  }

  if (isDtifDocument(tokens)) {
    throw new Error(
      'flattenDesignTokens requires DTIF documents that have been parsed to cache flattened entries. ' +
        'Call ensureDtifFlattenedTokens or parseDtifTokenObject before flattening.',
    );
  }

  throw new Error(
    'Expected DTIF token documents or pre-flattened DTIF tokens for flattening',
  );
}

/**
 * Collect flattened tokens from a set of themes with optional aggregation.
 *
 * @param tokensByTheme - Record of theme names to token objects.
 * @param theme - Specific theme to flatten; when omitted all themes are merged.
 * @param options - Optional normalization settings.
 * @returns Array of flattened DTIF entries.
 */
export function getFlattenedTokens(
  tokensByTheme: Record<string, DesignTokens | readonly DtifFlattenedToken[]>,
  theme?: string,
  options?: FlattenOptions,
): readonly DtifFlattenedToken[] {
  if (theme) {
    if (Object.prototype.hasOwnProperty.call(tokensByTheme, theme)) {
      return flattenDesignTokens(tokensByTheme[theme], options);
    }
    return [];
  }
  const transform = options?.nameTransform;
  const seen = new Map<string, DtifFlattenedToken>();
  for (const tokens of Object.values(tokensByTheme)) {
    for (const token of flattenDesignTokens(tokens, options)) {
      const key = toTokenKey(token, transform);
      if (!seen.has(key)) {
        seen.set(key, token);
      }
    }
  }
  return [...seen.values()];
}

function toTokenKey(
  token: DtifFlattenedToken,
  transform?: NameTransform,
): string {
  const base = token.segments.join('.');
  return transform ? normalizePath(base, transform) : base;
}

function isDtifFlattenedTokenArray(
  tokens: DesignTokens | readonly DtifFlattenedToken[],
): tokens is readonly DtifFlattenedToken[] {
  return Array.isArray(tokens);
}

function isDtifDocument(tokens: unknown): tokens is DesignTokens {
  if (!tokens || typeof tokens !== 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(tokens, '$version');
}
