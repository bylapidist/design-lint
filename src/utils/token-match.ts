export type TokenPattern = string | RegExp;

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternToRegExp(pattern: TokenPattern): RegExp {
  if (pattern instanceof RegExp) return pattern;
  const escaped = escapeRegExp(pattern).replace(/\\\*/g, '.*');
  return new RegExp(`^${escaped}$`);
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

/** Extract a CSS variable name from a value like `var(--foo)` */
export function extractVarName(value: string): string | null {
  const m = value.trim().match(/^var\((--[A-Za-z0-9-_]+)\)$/);
  return m ? m[1] : null;
}
