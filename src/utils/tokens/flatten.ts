/**
 * @packageDocumentation
 *
 * Helpers for flattening design token objects and aggregating them across themes.
 */

import {
  parseDesignTokens,
  parseDtifDesignTokensObject,
  type TokenTransform,
} from '../../core/parser/index.js';
import type { DesignTokens, FlattenedToken } from '../../core/types.js';
import type {
  DtifParseSession,
  DtifSessionOptions,
} from '../../core/dtif/session.js';
import type { ColorSpace } from '../../core/parser/normalize-colors.js';
import { normalizePath, type NameTransform } from './path.js';

export interface FlattenOptions {
  /** Optional transform applied to each path segment */
  nameTransform?: NameTransform;
  /** Warning callback for parse or alias issues */
  onWarn?: (msg: string) => void;
  /** Desired output color space */
  colorSpace?: ColorSpace;
  /** Optional DTIF session override */
  session?: DtifParseSession;
  /** Optional DTIF session configuration */
  sessionOptions?: DtifSessionOptions;
  /** URI associated with the inline DTIF document */
  uri?: string | URL;
  /** Optional transforms applied before parsing */
  transforms?: readonly TokenTransform[];
}

export type FlattenDtifOptions = FlattenOptions;

function applyNameTransform(
  tokens: readonly FlattenedToken[],
  transform?: NameTransform,
): FlattenedToken[] {
  if (!transform) {
    return tokens.slice();
  }
  return tokens.map(({ path, aliases, ...rest }) => ({
    ...rest,
    path: normalizePath(path, transform),
    ...(aliases
      ? { aliases: aliases.map((alias) => normalizePath(alias, transform)) }
      : {}),
  }));
}

/**
 * Flatten a nested design token object into an array of tokens.
 *
 * @param tokens - Nested design token structure.
 * @param options - Optional normalization settings.
 * @returns Array of flattened tokens including metadata and resolved aliases.
 */
export async function flattenDesignTokens(
  tokens: DesignTokens,
  options: FlattenOptions = {},
): Promise<FlattenedToken[]> {
  const flat = await parseDesignTokens(tokens, undefined, {
    colorSpace: options.colorSpace,
    onWarn: options.onWarn,
    session: options.session,
    sessionOptions: options.sessionOptions,
    transforms: options.transforms,
    uri: options.uri,
  });
  return applyNameTransform(flat, options.nameTransform);
}

export async function flattenDtifDesignTokens(
  tokens: DesignTokens,
  options: FlattenDtifOptions = {},
): Promise<FlattenedToken[]> {
  const flat = await parseDtifDesignTokensObject(tokens, {
    colorSpace: options.colorSpace,
    onWarn: options.onWarn,
    session: options.session,
    sessionOptions: options.sessionOptions,
    uri: options.uri,
    transforms: options.transforms,
  });
  return applyNameTransform(flat, options.nameTransform);
}

/**
 * Collect flattened tokens from a set of themes with optional aggregation.
 *
 * @param tokensByTheme - Record of theme names to token objects.
 * @param theme - Specific theme to flatten; when omitted all themes are merged.
 * @param options - Optional normalization settings.
 * @returns Array of flattened tokens.
 */
export async function getFlattenedTokens(
  tokensByTheme: Record<string, DesignTokens>,
  theme?: string,
  options: FlattenOptions = {},
): Promise<FlattenedToken[]> {
  const transform = options.nameTransform;
  const warn = options.onWarn;
  if (theme) {
    if (Object.prototype.hasOwnProperty.call(tokensByTheme, theme)) {
      return flattenDesignTokens(tokensByTheme[theme], {
        ...options,
        nameTransform: transform,
        onWarn: warn,
      });
    }
    return Promise.resolve([]);
  }
  const seen = new Map<string, FlattenedToken>();
  for (const tokens of Object.values(tokensByTheme)) {
    const flattened = await flattenDesignTokens(tokens, {
      ...options,
      nameTransform: transform,
      onWarn: warn,
    });
    for (const flat of flattened) {
      if (!seen.has(flat.path)) {
        seen.set(flat.path, flat);
      }
    }
  }
  return Array.from(seen.values());
}
