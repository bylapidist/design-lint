export type TokenPattern = string | RegExp;

import levenshtein from 'fast-levenshtein';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternToRegExp(pattern: TokenPattern): RegExp {
  if (pattern instanceof RegExp) return pattern;
  const escaped = pattern
    .split('*')
    .map((seg) => escapeRegExp(seg))
    .join('.*');
  return new RegExp(`^${escaped}$`, 'i');
}

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
    if (patternToRegExp(p).test(name)) return name;
  }
  return null;
}

/**
 * Find the closest matching token using Levenshtein distance.
 * Only explicit string tokens are considered for suggestions.
 * @param name Raw token name used by the user.
 * @param patterns Available token names or patterns.
 * @returns Closest token or null if none found.
 */
export function closestToken(
  name: string,
  patterns: TokenPattern[],
): string | null {
  let best: { token: string; dist: number } | null = null;
  for (const p of patterns) {
    if (typeof p !== 'string') continue;
    const dist = levenshtein.get(name, p);
    if (!best || dist < best.dist) {
      best = { token: p, dist };
    }
  }
  return best?.token ?? null;
}

/** Extract a CSS variable name from a value like `var(--foo)` */
export function extractVarName(value: string): string | null {
  const m = value.trim().match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,.*)?\)$/);
  return m ? m[1] : null;
}
