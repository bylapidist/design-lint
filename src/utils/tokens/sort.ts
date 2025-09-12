/**
 * @packageDocumentation
 *
 * Utilities for sorting collections of flattened design tokens.
 */

import type { FlattenedToken } from '../../core/types.js';

/**
 * Comparator for ordering flattened tokens by their normalized path.
 *
 * @param a - First token to compare.
 * @param b - Second token to compare.
 * @returns Negative when `a` should sort before `b`, positive when after, and 0 when equal.
 */
export function compareTokenPath(a: FlattenedToken, b: FlattenedToken): number {
  return a.path.localeCompare(b.path);
}

/**
 * Return a new array of flattened tokens sorted by their normalized path.
 *
 * @param tokens - Tokens to sort.
 * @returns Sorted token array.
 */
export function sortTokensByPath(tokens: FlattenedToken[]): FlattenedToken[] {
  return [...tokens].sort(compareTokenPath);
}
