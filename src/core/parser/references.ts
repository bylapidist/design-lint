import type { FlattenedToken } from '../types.js';
import { extractPointerFragment } from '../../utils/tokens/index.js';

export interface ReferenceResolutionResult {
  value: unknown;
  references: string[];
  fallbacks?: unknown[];
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

  function trackReference(fragment: string): void {
    if (!referenceSet.has(fragment)) {
      referenceSet.add(fragment);
      references.push(fragment);
    }
  }

  function requirePointerFragment(pointer: string, origin: string): string {
    const fragment = extractPointerFragment(pointer);
    if (!fragment) {
      throw new Error(
        `Token ${origin} has invalid $ref ${pointer}; expected a JSON Pointer fragment`,
      );
    }
    return fragment;
  }

  function describeAncestry(chain: string[]): string {
    return chain
      .map((fragment) => tokenMap.get(fragment)?.path ?? fragment)
      .join(' -> ');
  }

  function resolvePointerValue(
    pointer: string,
    origin: string,
    ancestry: string[],
    expectedType?: string,
  ): unknown {
    const fragment = requirePointerFragment(pointer, origin);

    if (fragment === '#') {
      warnings.push(
        `Token ${origin} references unsupported fallback $ref ${pointer}`,
      );
      trackReference(fragment);
      return { $ref: pointer };
    }

    if (ancestry.includes(fragment)) {
      throw new Error(
        `Circular $ref reference: ${describeAncestry([...ancestry, fragment])}`,
      );
    }

    trackReference(fragment);

    const target = tokenMap.get(fragment);
    if (!target) {
      throw new Error(
        `Token ${origin} references unknown token via $ref ${pointer}`,
      );
    }

    const resolved = resolve(target, [...ancestry, fragment], origin);

    if (!resolved.type) {
      throw new Error(
        `Token ${origin} references token without $type via $ref ${pointer}`,
      );
    }

    if (expectedType && resolved.type !== expectedType) {
      warnings.push(
        `Token ${origin} has fallback $ref ${pointer} with mismatched $type ${resolved.type}; expected ${expectedType}`,
      );
    }

    if (resolved.value === undefined) {
      throw new Error(
        `Token ${origin} references token without $value via $ref ${pointer}`,
      );
    }

    return resolved.value;
  }

  function resolveValue(
    node: unknown,
    ancestry: string[],
    origin: string,
  ): unknown {
    if (Array.isArray(node)) {
      return node.map((item) => resolveValue(item, ancestry, origin));
    }
    if (isPlainObject(node)) {
      const pointer = node.$ref;
      if (typeof pointer === 'string') {
        const keys = Object.keys(node);
        if (!keys.every((key) => key === '$ref')) {
          const out: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(node)) {
            out[key] = resolveValue(value, ancestry, origin);
          }
          return out;
        }

        const fragment = requirePointerFragment(pointer, origin);
        trackReference(fragment);

        if (fragment === '#') {
          return node;
        }

        if (ancestry.includes(fragment)) {
          throw new Error(
            `Circular $ref reference: ${describeAncestry([...ancestry, fragment])}`,
          );
        }

        const target = tokenMap.get(fragment);
        if (!target) {
          throw new Error(
            `Token ${origin} references unknown token via $ref ${pointer}`,
          );
        }
        const resolved = resolve(target, [...ancestry, fragment], origin);
        return resolved.value;
      }
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        out[key] = resolveValue(value, ancestry, origin);
      }
      return out;
    }
    return node;
  }

  const ARRAY_LITERAL_TYPES = new Set(['cubicBezier', 'gradient', 'shadow']);

  function isFallbackEntry(value: unknown): boolean {
    if (Array.isArray(value)) {
      return true;
    }
    if (isPlainObject(value)) {
      if ('$ref' in value || '$value' in value || 'fn' in value) {
        return true;
      }
      return false;
    }
    return true;
  }

  function resolveFallbackChain(
    chain: unknown,
    origin: string,
    ancestry: string[],
    tokenType?: string,
  ): unknown[] {
    if (chain === undefined) {
      return [];
    }

    const entries = Array.isArray(chain) ? chain : [chain];
    const resolved: unknown[] = [];

    for (const entry of entries) {
      if (Array.isArray(entry)) {
        resolved.push(
          ...resolveFallbackChain(entry, origin, ancestry, tokenType),
        );
        continue;
      }

      if (isPlainObject(entry)) {
        const ref: unknown = Reflect.get(entry, '$ref');
        const hasValue = Object.prototype.hasOwnProperty.call(entry, '$value');
        const hasFallback = Object.prototype.hasOwnProperty.call(
          entry,
          '$fallback',
        );

        if (typeof ref === 'string') {
          resolved.push(resolvePointerValue(ref, origin, ancestry, tokenType));
        } else if (hasValue) {
          resolved.push(
            resolveValue(Reflect.get(entry, '$value'), ancestry, origin),
          );
        } else {
          resolved.push(resolveValue(entry, ancestry, origin));
        }

        if (hasFallback) {
          resolved.push(
            ...resolveFallbackChain(
              Reflect.get(entry, '$fallback'),
              origin,
              ancestry,
              tokenType,
            ),
          );
        }

        continue;
      }

      resolved.push(resolveValue(entry, ancestry, origin));
    }

    return resolved;
  }

  function extractValue(
    node: unknown,
    ancestry: string[],
    origin: string,
    tokenType?: string,
  ): { primary: unknown; fallbacks?: unknown[] } {
    if (Array.isArray(node)) {
      const treatAsFallback =
        !tokenType || !ARRAY_LITERAL_TYPES.has(tokenType)
          ? node.some((item) => isFallbackEntry(item))
          : false;
      if (!treatAsFallback) {
        const resolvedEntries = node.map((item) =>
          resolveValue(item, ancestry, origin),
        );
        return {
          primary: resolvedEntries,
        };
      }

      const resolvedFallbacks = resolveFallbackChain(
        node,
        origin,
        ancestry,
        tokenType,
      );

      if (resolvedFallbacks.length === 0) {
        return { primary: undefined };
      }

      const [first, ...rest] = resolvedFallbacks;
      return {
        primary: first,
        fallbacks: rest.length > 0 ? rest : undefined,
      };
    }

    return { primary: resolveValue(node, ancestry, origin) };
  }

  function resolve(
    current: FlattenedToken,
    ancestry: string[],
    origin: string,
  ): FlattenedToken {
    const pointer = current.ref;
    if (!pointer) {
      return current;
    }

    const fragment = requirePointerFragment(pointer, origin);
    trackReference(fragment);

    if (fragment === '#') {
      return current;
    }

    if (ancestry.includes(fragment)) {
      throw new Error(
        `Circular $ref reference: ${describeAncestry([...ancestry, fragment])}`,
      );
    }

    const target = tokenMap.get(fragment);
    if (!target) {
      throw new Error(
        `Token ${origin} references unknown token via $ref ${pointer}`,
      );
    }

    const resolved = resolve(target, [...ancestry, fragment], origin);

    if (!resolved.type) {
      throw new Error(
        `Token ${origin} references token without $type via $ref ${pointer}`,
      );
    }

    if (resolved.value === undefined) {
      throw new Error(
        `Token ${origin} references token without $value via $ref ${pointer}`,
      );
    }

    let typesMatch = true;
    if (!current.type) {
      current.type = resolved.type;
    } else if (resolved.type && current.type !== resolved.type) {
      typesMatch = false;
      warnings.push(
        `Token ${origin} has mismatched $type ${current.type}; expected ${resolved.type}`,
      );
    }

    if (current.value === undefined && typesMatch) {
      current.value = resolved.value;
    }

    return resolved;
  }

  resolve(token, [token.pointer], token.path);
  let primary: unknown = token.value;
  let fallbackValues: unknown[] | undefined;
  if (token.value !== undefined) {
    const resolved = extractValue(
      token.value,
      [token.pointer],
      token.path,
      token.type,
    );
    primary = resolved.primary;
    fallbackValues = resolved.fallbacks;
  }

  return {
    value: primary,
    references,
    ...(fallbackValues ? { fallbacks: fallbackValues } : {}),
  };
}
