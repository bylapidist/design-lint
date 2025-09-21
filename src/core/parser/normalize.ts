import type { FlattenedToken } from '../types.js';
import { resolveReferences } from './references.js';

export function normalizeTokens(
  tokens: FlattenedToken[],
  warn: (msg: string) => void = console.warn,
): FlattenedToken[] {
  const tokensByPath = new Map(tokens.map((t) => [t.path, t]));
  const warnings: string[] = [];
  for (const token of tokens) {
    const { value, references } = resolveReferences(
      token,
      tokensByPath,
      warnings,
    );
    token.value = value;
    if (references.length > 0) {
      token.aliases = Array.from(new Set(references));
    } else if (token.aliases) {
      delete token.aliases;
    }
  }
  for (const w of warnings) warn(w);
  return tokens;
}
