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
import { isLikelyDtifDesignTokens } from '../../core/dtif/detect.js';
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
}

export interface FlattenDtifOptions extends FlattenOptions {
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
export function flattenDesignTokens(
  tokens: DesignTokens,
  options?: FlattenOptions,
): FlattenedToken[] {
  if (isLikelyDtifDesignTokens(tokens)) {
    throw new Error(
      'flattenDesignTokens does not support DTIF documents. Use flattenDtifDesignTokens instead.',
    );
  }
  const flat = parseDesignTokens(tokens, undefined, {
    onWarn: options?.onWarn,
  });
  return applyNameTransform(flat, options?.nameTransform);
}

export async function flattenDtifDesignTokens(
  tokens: Record<string, unknown>,
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
