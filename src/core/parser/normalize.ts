import type { FlattenedToken } from '../types.js';
import { resolveAliases } from './alias.js';

export function normalizeTokens(tokens: FlattenedToken[]): FlattenedToken[] {
  const tokenMap = new Map(tokens.map((t) => [t.path, t.token]));
  for (const { path, token } of tokens) {
    const { value, refs } = resolveAliases(token.$value, path, token, tokenMap);
    token.$value = value;
    if (refs.length) {
      token.aliasOf = Array.from(new Set(refs));
    }
  }
  return tokens;
}
