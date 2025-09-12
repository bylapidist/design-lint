import type { DesignTokens, FlattenedToken } from './types.js';
import picomatch from 'picomatch';
import leven from 'leven';
import { parseDesignTokens } from './parser/index.js';

export type TokenPattern = string | RegExp;

export type NameTransform = 'kebab-case' | 'camelCase' | 'PascalCase';

function transformSegment(seg: string, transform?: NameTransform): string {
  if (!transform) return seg;
  switch (transform) {
    case 'kebab-case':
      return seg
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase();
    case 'camelCase':
      return seg
        .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ''))
        .replace(/^[A-Z]/, (s) => s.toLowerCase());
    case 'PascalCase':
      return seg
        .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ''))
        .replace(/^[a-z]/, (s) => s.toUpperCase());
    default:
      return seg;
  }
}

export function normalizePath(path: string, transform?: NameTransform): string {
  const parts = path.split(/[./]/).filter(Boolean);
  return parts.map((p) => transformSegment(p, transform)).join('.');
}

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

export interface FlattenOptions {
  nameTransform?: NameTransform;
}

export function flattenDesignTokens(
  tokens: DesignTokens,
  options?: FlattenOptions,
): FlattenedToken[] {
  const flat = parseDesignTokens(tokens);
  const transform = options?.nameTransform;
  return flat.map(({ path, aliases, ...rest }) => ({
    ...rest,
    path: normalizePath(path, transform),
    ...(aliases
      ? { aliases: aliases.map((a) => normalizePath(a, transform)) }
      : {}),
  }));
}

export function getFlattenedTokens(
  tokensByTheme: Record<string, DesignTokens>,
  theme?: string,
  options?: FlattenOptions,
): FlattenedToken[] {
  const transform = options?.nameTransform;
  if (theme) {
    if (Object.prototype.hasOwnProperty.call(tokensByTheme, theme)) {
      return flattenDesignTokens(tokensByTheme[theme], {
        nameTransform: transform,
      });
    }
    return [];
  }
  // dedupe tokens by their path across themes
  const seen = new Map<string, FlattenedToken>();
  for (const tokens of Object.values(tokensByTheme)) {
    for (const flat of flattenDesignTokens(tokens, {
      nameTransform: transform,
    })) {
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
