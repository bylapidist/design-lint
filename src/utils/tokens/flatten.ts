/**
 * @packageDocumentation
 *
 * Helpers for flattening design token objects and aggregating them across themes.
 */

import { parseDesignTokens } from '../../core/parser/index.js';
import type {
  DesignTokens,
  FlattenedToken,
  TokenOverride,
  TokenValueCandidate,
} from '../../core/types.js';
import { normalizePath, type NameTransform } from './path.js';

function mapCandidates(
  candidates: TokenValueCandidate[] | undefined,
  transform?: NameTransform,
): TokenValueCandidate[] | undefined {
  if (!candidates) return undefined;
  return candidates.map((candidate) => {
    const ref = candidate.ref
      ? transform
        ? normalizePath(candidate.ref, transform)
        : candidate.ref
      : undefined;
    return {
      value: candidate.value,
      ...(ref ? { ref } : {}),
    } satisfies TokenValueCandidate;
  });
}

function mapOverrides(
  overrides: TokenOverride[] | undefined,
  transform?: NameTransform,
): TokenOverride[] | undefined {
  if (!overrides) return undefined;
  return overrides.map((override) => {
    const ref = override.ref
      ? transform
        ? normalizePath(override.ref, transform)
        : override.ref
      : undefined;
    const fallback = mapCandidates(override.fallback, transform);
    return {
      source: override.source,
      when: { ...override.when },
      ...(override.value !== undefined ? { value: override.value } : {}),
      ...(ref ? { ref } : {}),
      ...(fallback ? { fallback } : {}),
    } satisfies TokenOverride;
  });
}

export interface FlattenOptions {
  /** Optional transform applied to each path segment */
  nameTransform?: NameTransform;
  /** Warning callback for parse or alias issues */
  onWarn?: (msg: string) => void;
  /** Whether to validate tokens against the DTIF schema (defaults to true). */
  validate?: boolean;
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
    validate: options?.validate ?? true,
  });
  const transform = options?.nameTransform;
  return flat.map((token) => {
    const { path, value, type, metadata } = token;
    const aliases = token.aliases ? [...token.aliases] : undefined;
    const ref = token.ref;
    const baseCandidates = mapCandidates(token.candidates);
    const baseOverrides = mapOverrides(token.overrides);

    if (!transform) {
      return {
        path,
        value,
        ...(type ? { type } : {}),
        ...(baseCandidates ? { candidates: baseCandidates } : {}),
        ...(ref ? { ref } : {}),
        ...(aliases ? { aliases } : {}),
        ...(baseOverrides ? { overrides: baseOverrides } : {}),
        metadata,
      } satisfies FlattenedToken;
    }

    const normalizedPath = normalizePath(path, transform);
    const normalizedAliases = aliases?.map((alias) =>
      normalizePath(alias, transform),
    );
    const normalizedRef = ref ? normalizePath(ref, transform) : undefined;
    const normalizedCandidates = mapCandidates(token.candidates, transform);
    const normalizedOverrides = mapOverrides(token.overrides, transform);

    return {
      path: normalizedPath,
      value,
      ...(type ? { type } : {}),
      ...(normalizedCandidates ? { candidates: normalizedCandidates } : {}),
      ...(normalizedRef ? { ref: normalizedRef } : {}),
      ...(normalizedAliases ? { aliases: normalizedAliases } : {}),
      ...(normalizedOverrides ? { overrides: normalizedOverrides } : {}),
      metadata,
    } satisfies FlattenedToken;
  });
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
        validate: options?.validate,
      });
    }
    return [];
  }
  const seen = new Map<string, FlattenedToken>();
  for (const tokens of Object.values(tokensByTheme)) {
    for (const flat of flattenDesignTokens(tokens, {
      nameTransform: transform,
      onWarn: warn,
      validate: options?.validate,
    })) {
      if (!seen.has(flat.path)) {
        seen.set(flat.path, flat);
      }
    }
  }
  return [...seen.values()];
}
