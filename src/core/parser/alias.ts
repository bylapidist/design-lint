import type { FlattenedToken } from '../types.js';
import { collections } from '../../utils/index.js';

const { isArray } = collections;

const ALIAS_GLOBAL = /\{([^}]+)\}/g;
const ALIAS_EXACT = /^\{([^}]+)\}$/;

function normalizeAliasPath(path: string): string {
  return path.split(/[./]/).filter(Boolean).join('.');
}

function resolveAlias(
  rawPath: string,
  tokenMap: Map<string, FlattenedToken>,
  stack: string[],
  warnings: string[],
): FlattenedToken | undefined {
  const targetPath = normalizeAliasPath(rawPath);
  if (stack.includes(targetPath)) {
    warnings.push(
      `Circular alias reference: ${[...stack, targetPath].join(' -> ')}`,
    );
    return undefined;
  }
  const target = tokenMap.get(targetPath);
  if (!target) {
    const source = stack[0];
    warnings.push(`Token ${source} references unknown token: ${targetPath}`);
    return undefined;
  }
  const next =
    typeof target.value === 'string' ? ALIAS_EXACT.exec(target.value) : null;
  if (next) {
    return resolveAlias(next[1], tokenMap, [...stack, targetPath], warnings);
  }
  if (!target.type) {
    const source = stack[0];
    warnings.push(
      `Token ${source} references token without type: ${targetPath}`,
    );
    return undefined;
  }
  if (target.value === undefined) {
    const source = stack[0];
    warnings.push(
      `Token ${source} references token without value: ${targetPath}`,
    );
    return undefined;
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
  token: FlattenedToken,
  tokenMap: Map<string, FlattenedToken>,
  warnings: string[],
): AliasResult {
  const refs: string[] = [];

  function walk(val: unknown, expectedType?: string): unknown {
    if (typeof val === 'string') {
      const exact = ALIAS_EXACT.exec(val);
      if (exact) {
        const ref = normalizeAliasPath(exact[1]);
        refs.push(ref);
        const target = resolveAlias(ref, tokenMap, [path], warnings);
        if (target) {
          const aliasType = target.type;
          if (expectedType) {
            if (!aliasType) {
              warnings.push(
                `Token ${path} references token without type: ${ref}`,
              );
              return val;
            }
            if (aliasType !== expectedType) {
              warnings.push(
                `Token ${path} has mismatched type ${expectedType}; expected ${aliasType}`,
              );
              return val;
            }
          } else if (!token.type && aliasType) {
            token.type = aliasType;
          }
          return target.value;
        }
        return val;
      }
      return val.replace(ALIAS_GLOBAL, (_, ref: string) => {
        const norm = normalizeAliasPath(ref);
        refs.push(norm);
        const target = resolveAlias(norm, tokenMap, [path], warnings);
        return target ? String(target.value) : `{${norm}}`;
      });
    }
    if (isArray(val)) {
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

  return { value: walk(value, token.type), refs };
}

export { resolveAlias };
