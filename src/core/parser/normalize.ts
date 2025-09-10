import type { Token, FlattenedToken } from '../types.js';

const ALIAS_PATTERN = /^\{([^}]+)\}$/;

export function isAlias(value: unknown): string | null {
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    return m ? m[1] : null;
  }
  return null;
}

function resolveAlias(
  targetPath: string,
  tokenMap: Map<string, Token>,
  stack: string[],
): Token {
  if (stack.includes(targetPath)) {
    throw new Error(
      `Circular alias reference: ${[...stack, targetPath].join(' -> ')}`,
    );
  }
  const target = tokenMap.get(targetPath);
  if (!target) {
    const source = stack[0];
    throw new Error(`Token ${source} references unknown token: ${targetPath}`);
  }
  const next =
    typeof target.$value === 'string'
      ? ALIAS_PATTERN.exec(target.$value)
      : null;
  if (next) {
    return resolveAlias(next[1], tokenMap, [...stack, targetPath]);
  }
  if (!target.$type) {
    const source = stack[0];
    throw new Error(
      `Token ${source} references token without $type: ${targetPath}`,
    );
  }
  if (target.$value === undefined) {
    const source = stack[0];
    throw new Error(
      `Token ${source} references token without $value: ${targetPath}`,
    );
  }
  return target;
}

export function expectAlias(
  value: string,
  path: string,
  expected: string,
  tokenMap: Map<string, Token>,
): void {
  const targetPath = isAlias(value);
  if (!targetPath) {
    throw new Error(`Token ${path} has invalid ${expected} reference`);
  }
  const target = resolveAlias(targetPath, tokenMap, [path]);
  if (target.$type !== expected) {
    throw new Error(
      `Token ${path} references token of type ${String(
        target.$type,
      )}; expected ${expected}`,
    );
  }
}

export function normalizeTokens(tokens: FlattenedToken[]): FlattenedToken[] {
  const tokenMap = new Map(tokens.map((t) => [t.path, t.token]));
  for (const { path, token } of tokens) {
    if (typeof token.$value === 'string') {
      const match = ALIAS_PATTERN.exec(token.$value);
      if (match) {
        const target = resolveAlias(match[1], tokenMap, [path]);
        const aliasType = target.$type;
        if (!aliasType) {
          throw new Error(
            `Token ${path} references token without $type: ${match[1]}`,
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
