import type { DesignTokens, FlattenedToken } from './types';
import picomatch from 'picomatch';
import leven from 'leven';
import { parseDesignTokens } from './parser/index';

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
  theme?: string,
): FlattenedToken[] {
  if (theme) {
    if (Object.prototype.hasOwnProperty.call(tokensByTheme, theme)) {
      return parseDesignTokens(tokensByTheme[theme]);
    }
    return [];
  }
  // dedupe tokens by their path across themes
  const seen = new Map<string, FlattenedToken>();
  for (const tokens of Object.values(tokensByTheme)) {
    for (const flat of parseDesignTokens(tokens)) {
      if (!seen.has(flat.path)) {
        seen.set(flat.path, flat);
      }
    }
  }
  return [...seen.values()];
}

export function extractVarName(value: string): string | null {
  const m = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,.*)?\)$/.exec(value.trim());
  return m ? m[1] : null;
}
