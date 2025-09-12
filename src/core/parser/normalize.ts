import type { FlattenedToken } from '../types.js';
import { resolveAliases } from './alias.js';

export function normalizeTokens(tokens: FlattenedToken[]): FlattenedToken[] {
  const tokenMap = new Map(tokens.map((t) => [t.path, t]));
  const warnings: string[] = [];
  for (const token of tokens) {
    const { value, refs } = resolveAliases(
      token.value,
      token.path,
      token,
      tokenMap,
      warnings,
    );
    token.value = value;
    if (refs.length) {
      token.aliases = Array.from(new Set(refs));
    }
  }
  for (const w of warnings) {
    console.warn(w);
  }
  return tokens;
}
