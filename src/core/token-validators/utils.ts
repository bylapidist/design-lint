import type { Token } from '../types.js';

export const ALIAS_PATTERN = /^\{([^}]+)\}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAlias(value: unknown): string | null {
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    return m ? m[1] : null;
  }
  return null;
}

export function resolveAlias(
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
