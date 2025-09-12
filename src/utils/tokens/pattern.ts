/**
 * @packageDocumentation
 *
 * Helpers for matching token names against pattern collections.
 */

import picomatch from 'picomatch';
import leven from 'leven';

export type TokenPattern = string | RegExp;

/**
 * Test whether a token name satisfies any pattern in the provided list.
 *
 * @param name - Token name to test.
 * @param patterns - Glob or regular expression patterns to match against.
 * @returns The original name when a pattern matches; otherwise `null`.
 */
export function matchToken(
  name: string,
  patterns: TokenPattern[],
): string | null {
  for (const p of patterns) {
    if (p instanceof RegExp) {
      if (p.test(name)) return name;
    } else if (picomatch.isMatch(name, p, { nocase: true })) {
      return name;
    }
  }
  return null;
}

/**
 * Suggest the closest token name from a list of string patterns using Levenshtein distance.
 *
 * @param name - Token name to compare.
 * @param patterns - Candidate token names; non-string patterns are ignored.
 * @returns The closest matching token name or `null` if none.
 */
export function closestToken(
  name: string,
  patterns: TokenPattern[],
): string | null {
  const tokens = patterns.filter((p): p is string => typeof p === 'string');
  if (tokens.length === 0) return null;
  let best = tokens[0];
  let bestDistance = leven(name, best);
  for (const token of tokens.slice(1)) {
    const distance = leven(name, token);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = token;
    }
  }
  return best;
}
