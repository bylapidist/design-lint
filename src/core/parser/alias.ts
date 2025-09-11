import type { Token } from '../types.js';

const ALIAS_GLOBAL = /\{([^}]+)\}/g;
const ALIAS_EXACT = /^\{([^}]+)\}$/;

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
    typeof target.$value === 'string' ? ALIAS_EXACT.exec(target.$value) : null;
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

export interface AliasResult {
  value: unknown;
  refs: string[];
}

export function resolveAliases(
  value: unknown,
  path: string,
  token: Token,
  tokenMap: Map<string, Token>,
): AliasResult {
  const refs: string[] = [];

  function walk(val: unknown, expectedType?: string): unknown {
    if (typeof val === 'string') {
      const exact = ALIAS_EXACT.exec(val);
      if (exact) {
        refs.push(exact[1]);
        const target = resolveAlias(exact[1], tokenMap, [path]);
        const aliasType = target.$type;
        if (expectedType) {
          if (!aliasType) {
            throw new Error(
              `Token ${path} references token without $type: ${exact[1]}`,
            );
          }
          if (aliasType !== expectedType) {
            throw new Error(
              `Token ${path} has mismatched $type ${expectedType}; expected ${aliasType}`,
            );
          }
        } else if (!token.$type && aliasType) {
          token.$type = aliasType;
        }
        return target.$value;
      }
      return val.replace(ALIAS_GLOBAL, (_, ref: string) => {
        refs.push(ref);
        const target = resolveAlias(ref, tokenMap, [path]);
        return String(target.$value);
      });
    }
    if (Array.isArray(val)) {
      return val.map((v) => walk(v));
    }
    if (typeof val === 'object' && val !== null) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val)) {
        out[k] = walk(v);
      }
      return out;
    }
    return val;
  }

  return { value: walk(value, token.$type), refs };
}

export { resolveAlias };
