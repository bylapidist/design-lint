export type TokenPattern = string | RegExp;

import picomatch from 'picomatch';
import { findBestMatch } from 'string-similarity';

/**
 * Match a CSS variable name against provided token patterns.
 * @param name CSS variable name (e.g. --color-primary)
 * @param patterns List of allowed token patterns or explicit names.
 * @returns The concrete token that matched or null if no match.
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
 * Find the closest matching token using string similarity.
 * Only explicit string tokens are considered for suggestions.
 * @param name Raw token name used by the user.
 * @param patterns Available token names or patterns.
 * @returns Closest token or null if none found.
 */
export function closestToken(
  name: string,
  patterns: TokenPattern[],
): string | null {
  const tokens = patterns.filter((p): p is string => typeof p === 'string');
  if (tokens.length === 0) return null;
  const { bestMatch } = findBestMatch(name, tokens);
  return bestMatch.target;
}

/** Extract a CSS variable name from a value like `var(--foo)` */
export function extractVarName(value: string): string | null {
  const m = value.trim().match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,.*)?\)$/);
  return m ? m[1] : null;
}
