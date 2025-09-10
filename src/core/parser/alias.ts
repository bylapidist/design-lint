import type { Token } from '../types.js';

export const ALIAS_PATTERN = /\{([^}]+)\}/g;

export function collectAliases(value: unknown, acc: string[] = []): string[] {
  if (typeof value === 'string') {
    let match: RegExpExecArray | null;
    while ((match = ALIAS_PATTERN.exec(value))) {
      acc.push(match[1]);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectAliases(item, acc);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectAliases(v, acc);
  }
  return acc;
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
      ? /^\{([^}]+)\}$/.exec(target.$value)
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

export function validateAliases(
  value: unknown,
  path: string,
  expected: string,
  tokenMap: Map<string, Token>,
  opts: { require?: boolean } = {},
): string[] {
  const aliases = collectAliases(value);
  if (opts.require && aliases.length === 0) {
    throw new Error(`Token ${path} has invalid ${expected} reference`);
  }
  for (const alias of aliases) {
    const target = resolveAlias(alias, tokenMap, [path]);
    if (target.$type !== expected) {
      throw new Error(
        `Token ${path} references token of type ${String(
          target.$type,
        )}; expected ${expected}`,
      );
    }
  }
  return aliases;
}

export function isExactAlias(value: unknown): string | null {
  if (typeof value === 'string') {
    const m = /^\{([^}]+)\}$/.exec(value);
    return m ? m[1] : null;
  }
  return null;
}

export { resolveAlias };
