import type { FlattenedToken } from '../types.js';
import { resolveAliases } from './alias.js';

export function normalizeTokens(
  tokens: FlattenedToken[],
  warn: (msg: string) => void = console.warn,
): FlattenedToken[] {
  const tokenMap = new Map(tokens.map((t) => [t.path, t]));
  const warnings: string[] = [];
  for (const token of tokens) {
    const rawValue = token.value;
    const hadArrayValue = Array.isArray(rawValue);
    const { value, refs, type, candidates } = resolveAliases(
      token,
      tokenMap,
      warnings,
    );
    token.value = value;
    if (hadArrayValue || candidates.length > 1) {
      token.candidates = candidates;
    } else {
      delete token.candidates;
    }
    if (!token.type && type) {
      token.type = type;
    }
    if (candidates.length > 0 && candidates[0].ref) {
      token.ref = candidates[0].ref;
    } else if (hadArrayValue) {
      delete token.ref;
    } else if (token.ref && refs.length > 0) {
      token.ref = refs[0];
    }
    if (refs.length) {
      token.aliases = Array.from(new Set(refs));
    }
  }
  for (const w of warnings) warn(w);
  return tokens;
}
