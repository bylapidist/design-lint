import type { FlattenedToken } from '../types.js';
import { resolveAliases } from './alias.js';

export function normalizeTokens(
  tokens: FlattenedToken[],
  warn: (msg: string) => void = console.warn,
): FlattenedToken[] {
  const tokenMap = new Map(tokens.map((t) => [t.path, t]));
  const warnings: string[] = [];
  for (const token of tokens) {
    const { value, refs, type } = resolveAliases(token, tokenMap, warnings);
    token.value = value;
    if (!token.type && type) {
      token.type = type;
    }
    if (token.ref && refs.length > 0) {
      token.ref = refs[0];
    }
    if (refs.length) {
      token.aliases = Array.from(new Set(refs));
    }
  }
  for (const w of warnings) warn(w);
  return tokens;
}
