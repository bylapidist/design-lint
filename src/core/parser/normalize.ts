import type { FlattenedToken } from '../types.js';
import { resolveReferences } from './references.js';

export function normalizeTokens(
  tokens: FlattenedToken[],
  warn: (msg: string) => void = console.warn,
): FlattenedToken[] {
  const tokensByPointer = new Map(tokens.map((t) => [t.pointer, t]));
  const warnings: string[] = [];
  for (const token of tokens) {
    const { value, references, fallbacks } = resolveReferences(
      token,
      tokensByPointer,
      warnings,
    );
    token.value = value;
    if (fallbacks && fallbacks.length > 0) {
      token.fallbacks = fallbacks;
    } else {
      delete token.fallbacks;
    }
    if (references.length > 0) {
      token.aliases = Array.from(new Set(references));
    } else if (token.aliases) {
      delete token.aliases;
    }
  }
  for (const w of warnings) warn(w);
  return tokens;
}
