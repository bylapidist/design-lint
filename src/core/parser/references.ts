import type { FlattenedToken } from '../types.js';
import { pointerToPath } from '../../utils/tokens/index.js';

export interface ReferenceResolutionResult {
  value: unknown;
  references: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveReferences(
  token: FlattenedToken,
  tokenMap: Map<string, FlattenedToken>,
  warnings: string[],
): ReferenceResolutionResult {
  const references: string[] = [];
  const referenceSet = new Set<string>();

  function trackReference(identifier: string): void {
    if (!referenceSet.has(identifier)) {
      referenceSet.add(identifier);
      references.push(identifier);
    }
  }

  function assertPointer(pointer: string, origin: string): void {
    if (!pointer.includes('#')) {
      throw new Error(
        `Token ${origin} has invalid $ref ${pointer}; expected a JSON Pointer fragment`,
      );
    }
  }

  function resolveValue(node: unknown, ancestry: string[]): unknown {
    if (Array.isArray(node)) {
      return node.map((item) => resolveValue(item, ancestry));
    }
    if (isPlainObject(node)) {
      const pointer = node.$ref;
      if (typeof pointer === 'string') {
        const keys = Object.keys(node);
        if (!keys.every((key) => key === '$ref')) {
          const out: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(node)) {
            out[key] = resolveValue(value, ancestry);
          }
          return out;
        }
        assertPointer(pointer, ancestry[0]);
        const asPath = pointerToPath(pointer);
        const identifier = asPath ?? pointer;
        trackReference(identifier);
        if (!asPath) {
          return node;
        }
        const target = tokenMap.get(asPath);
        if (!target) {
          throw new Error(
            `Token ${ancestry[0]} references unknown token via $ref ${pointer}`,
          );
        }
        const resolved = resolve(target, [...ancestry, asPath]);
        return resolved.value;
      }
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        out[key] = resolveValue(value, ancestry);
      }
      return out;
    }
    return node;
  }

  function resolve(
    current: FlattenedToken,
    ancestry: string[],
  ): FlattenedToken {
    const pointer = current.ref;
    if (!pointer) {
      return current;
    }

    assertPointer(pointer, ancestry[0]);

    const asPath = pointerToPath(pointer);
    const identifier = asPath ?? pointer;

    if (ancestry.includes(identifier)) {
      throw new Error(
        `Circular $ref reference: ${[...ancestry, identifier].join(' -> ')}`,
      );
    }

    trackReference(identifier);

    if (!asPath) {
      return current;
    }

    const target = tokenMap.get(asPath);
    if (!target) {
      throw new Error(
        `Token ${ancestry[0]} references unknown token via $ref ${pointer}`,
      );
    }

    const resolved = resolve(target, [...ancestry, asPath]);

    if (!resolved.type) {
      throw new Error(
        `Token ${ancestry[0]} references token without $type via $ref ${pointer}`,
      );
    }

    if (resolved.value === undefined) {
      throw new Error(
        `Token ${ancestry[0]} references token without $value via $ref ${pointer}`,
      );
    }

    let typesMatch = true;
    if (!current.type) {
      current.type = resolved.type;
    } else if (resolved.type && current.type !== resolved.type) {
      typesMatch = false;
      warnings.push(
        `Token ${ancestry[0]} has mismatched $type ${current.type}; expected ${resolved.type}`,
      );
    }

    if (current.value === undefined && typesMatch) {
      current.value = resolved.value;
    }

    return resolved;
  }

  resolve(token, [token.path]);
  if (token.value !== undefined) {
    token.value = resolveValue(token.value, [token.path]);
  }

  return {
    value: token.value,
    references,
  };
}
