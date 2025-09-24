/**
 * @packageDocumentation
 *
 * Utilities for sorting collections of flattened design tokens.
 */

import type { DtifFlattenedToken } from '../../core/types.js';
import type { NameTransform } from './path.js';
import { getTokenPath } from './token-view.js';

export interface SortTokensOptions {
  /** Optional name transform applied when deriving paths for DTIF tokens. */
  nameTransform?: NameTransform;
}

/**
 * Comparator for ordering flattened tokens by their normalized path.
 *
 * @param a - First token to compare.
 * @param b - Second token to compare.
 * @returns Negative when `a` should sort before `b`, positive when after, and 0 when equal.
 */
export function compareTokenPath(
  a: DtifFlattenedToken,
  b: DtifFlattenedToken,
  options?: SortTokensOptions,
): number {
  const transform = options?.nameTransform;
  const pathA = getPath(a, transform);
  const pathB = getPath(b, transform);
  return pathA.localeCompare(pathB);
}

/**
 * Return a new array of flattened tokens sorted by their normalized path.
 *
 * @param tokens - Tokens to sort.
 * @returns Sorted token array.
 */
export function sortTokensByPath<T extends DtifFlattenedToken>(
  tokens: readonly T[],
  options?: SortTokensOptions,
): T[] {
  return [...tokens].sort((a, b) => compareTokenPath(a, b, options));
}

function getPath(token: DtifFlattenedToken, transform?: NameTransform): string {
  return getTokenPath(token, transform);
}
