import type { FlattenedToken } from '../types.js';
import { isExactAlias, resolveAlias } from './alias.js';

export function normalizeTokens(tokens: FlattenedToken[]): FlattenedToken[] {
  const tokenMap = new Map(tokens.map((t) => [t.path, t.token]));
  for (const { path, token } of tokens) {
    if (typeof token.$value === 'string') {
      const targetPath = isExactAlias(token.$value);
      if (targetPath) {
        const target = resolveAlias(targetPath, tokenMap, [path]);
        const aliasType = target.$type;
        if (!aliasType) {
          throw new Error(
            `Token ${path} references token without $type: ${targetPath}`,
          );
        }
        if (!token.$type) {
          token.$type = aliasType;
        } else if (token.$type !== aliasType) {
          throw new Error(
            `Token ${path} has mismatched $type ${token.$type}; expected ${aliasType}`,
          );
        }
        token.$value = target.$value;
      }
    }
  }
  return tokens;
}
