import type { DtifFlattenedToken } from '../../../core/types.js';

/**
 * Determine whether a flattened DTIF token belongs to the provided top-level group.
 *
 * @param token - Token to examine.
 * @param group - Top-level group name, e.g. `color` or `spacing`.
 */
export function isTokenInGroup(
  token: DtifFlattenedToken,
  group: string,
): boolean {
  return token.segments.length > 1 && token.segments[0] === group;
}

/**
 * Extract a token's string value when it represents a literal instead of an alias.
 *
 * @param token - Token to examine.
 * @param options - Controls alias handling.
 * @returns String literal value when present.
 */
export function getTokenStringValue(
  token: DtifFlattenedToken,
  options: { allowAliases?: boolean } = {},
): string | undefined {
  const value = token.value;
  if (typeof value !== 'string') {
    return undefined;
  }

  if (!options.allowAliases && value.startsWith('{')) {
    return undefined;
  }

  return value;
}
