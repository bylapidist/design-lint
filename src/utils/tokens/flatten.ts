/**
 * @packageDocumentation
 *
 * Helpers for flattening design token objects and aggregating them across themes.
 */

import { toLegacyFlattenedTokens } from '../../core/dtif/legacy-adapter.js';
import { parseDesignTokens } from '../../core/parser/index.js';
import type {
  DesignTokens,
  LegacyDesignTokens,
  DtifFlattenedToken,
  FlattenedToken,
} from '../../core/types.js';
import { normalizePath, type NameTransform } from './path.js';
import { getDtifFlattenedTokens } from './dtif-cache.js';
import { isTokenGroup } from '../guards/domain/is-token-group.js';

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
  tokens: DesignTokens | LegacyDesignTokens | readonly DtifFlattenedToken[],
  options?: FlattenOptions,
): FlattenedToken[] {
  const transform = options?.nameTransform;
  if (isDtifFlattenedTokenArray(tokens)) {
    return toLegacyFlattenedTokens(tokens).map((token) =>
      applyNameTransform(token, transform),
    );
  }

  const cached = getDtifFlattenedTokens(tokens);
  if (cached !== undefined) {
    return toLegacyFlattenedTokens(cached).map((token) =>
      applyNameTransform(token, transform),
    );
  }

  if (isDtifDocument(tokens)) {
    throw new Error(
      'flattenDesignTokens requires DTIF documents that have been parsed to cache flattened entries. ' +
        'Call ensureDtifFlattenedTokens or parseDtifTokenObject before flattening.',
    );
  }

  if (isLegacyDesignTokenTree(tokens)) {
    const flat = parseDesignTokens(tokens, undefined, {
      onWarn: options?.onWarn,
    });
    return flat.map((token) => applyNameTransform(token, transform));
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
 * @returns Array of flattened tokens.
 */
export function getFlattenedTokens(
  tokensByTheme: Record<
    string,
    DesignTokens | LegacyDesignTokens | readonly DtifFlattenedToken[]
  >,
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

function isDtifFlattenedTokenArray(
  tokens: DesignTokens | LegacyDesignTokens | readonly DtifFlattenedToken[],
): tokens is readonly DtifFlattenedToken[] {
  return Array.isArray(tokens);
}

function isLegacyDesignTokenTree(
  tokens: unknown,
): tokens is LegacyDesignTokens {
  return isTokenGroup(tokens);
}

function isDtifDocument(tokens: unknown): tokens is DesignTokens {
  if (!tokens || typeof tokens !== 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(tokens, '$version');
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
