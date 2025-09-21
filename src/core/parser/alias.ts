import { JsonPointer } from 'jsonpointerx';
import type { FlattenedToken } from '../types.js';

export interface AliasResult {
  value: unknown;
  refs: string[];
  type?: string;
}

function canonicalizeRef(ref: string, sourcePath: string): string {
  try {
    return JsonPointer.compile(ref).toString();
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    throw new Error(`Token ${sourcePath} has invalid $ref "${ref}"${detail}`);
  }
}

function resolvePointer(
  pointer: string,
  tokenMap: Map<string, FlattenedToken>,
  stack: Set<string>,
  refs: Set<string>,
): { value: unknown; type?: string } {
  const target = tokenMap.get(pointer);
  if (!target) {
    let origin = pointer;
    const first = stack.values().next().value;
    if (typeof first === 'string') {
      origin = first;
    }
    throw new Error(`Token ${origin} references unknown token at ${pointer}`);
  }
  return resolveToken(target, tokenMap, stack, refs);
}

function resolveToken(
  token: FlattenedToken,
  tokenMap: Map<string, FlattenedToken>,
  stack: Set<string>,
  refs: Set<string>,
): { value: unknown; type?: string } {
  if (stack.has(token.path)) {
    const cycle = [...stack, token.path].join(' -> ');
    throw new Error(`Circular $ref chain detected: ${cycle}`);
  }

  stack.add(token.path);
  try {
    if (!token.ref) {
      return { value: token.value, type: token.type };
    }
    const pointer = canonicalizeRef(token.ref, token.path);
    refs.add(pointer);
    const result = resolvePointer(pointer, tokenMap, stack, refs);
    if (token.aliases) {
      for (const alias of token.aliases) refs.add(alias);
    }
    return result;
  } finally {
    stack.delete(token.path);
  }
}

export function resolveAliases(
  token: FlattenedToken,
  tokenMap: Map<string, FlattenedToken>,
  warnings: string[],
): AliasResult {
  const refs = new Set<string>();
  const stack = new Set<string>();
  const { value, type } = resolveToken(token, tokenMap, stack, refs);

  if (token.type && type && token.type !== type) {
    warnings.push(
      `Token ${token.path} declares type ${token.type} but resolves to ${type}`,
    );
  }

  return { value, refs: [...refs], type };
}
