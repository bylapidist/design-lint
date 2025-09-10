import type { DesignTokens, FlattenedToken } from './types.js';
import picomatch from 'picomatch';
import leven from 'leven';
import { parseDesignTokens } from './parser/index.js';

export type TokenPattern = string | RegExp;

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

export function flattenDesignTokens(tokens: DesignTokens): FlattenedToken[] {
  return parseDesignTokens(tokens);
}

export function getFlattenedTokens(
  tokensByTheme: Record<string, DesignTokens>,
  theme = 'default',
): FlattenedToken[] {
  if (Object.prototype.hasOwnProperty.call(tokensByTheme, theme)) {
    return parseDesignTokens(tokensByTheme[theme]);
  }
  return [];
}

export function extractVarName(value: string): string | null {
  const m = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,.*)?\)$/.exec(value.trim());
  return m ? m[1] : null;
}
