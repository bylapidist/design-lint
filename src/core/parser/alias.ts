import type { FlattenedToken, TokenValueCandidate } from '../types.js';
import { canonicalizePointer } from './pointers.js';

export interface AliasResult {
  value: unknown;
  refs: string[];
  type?: string;
  candidates: TokenValueCandidate[];
}

type CandidateDescriptor =
  | { kind: 'ref'; ref: string; source: string }
  | { kind: 'value'; value: unknown; source: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function describeSource(path: string, hint: string): string {
  if (!path) return hint;
  return `${path}${hint}`;
}

const FALLBACK_KEYS = new Set(['$ref', '$value', '$fallback']);

interface FallbackEntryObject {
  $ref?: unknown;
  $value?: unknown;
  $fallback?: unknown;
}

function createRefDescriptor(ref: string, source: string): CandidateDescriptor {
  return { kind: 'ref', ref, source };
}

function createValueDescriptor(
  value: unknown,
  source: string,
): CandidateDescriptor {
  return { kind: 'value', value, source };
}

function isFallbackEntryObject(
  value: unknown,
): value is FallbackEntryObject & Record<string, unknown> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  if (!keys.every((key) => FALLBACK_KEYS.has(key))) return false;
  if ('$ref' in value && typeof value.$ref === 'string') return true;
  if (Object.prototype.hasOwnProperty.call(value, '$value')) return true;
  if ('$fallback' in value) return true;
  return false;
}

function collectFallbackEntryCandidates(
  entry: unknown,
  token: FlattenedToken,
  suffix: string,
): CandidateDescriptor[] {
  if (entry === undefined) {
    return [];
  }

  const source = describeSource(token.path, suffix);

  if (!isFallbackEntryObject(entry)) {
    return [createValueDescriptor(entry, source)];
  }

  const fallbackEntry: FallbackEntryObject & Record<string, unknown> = entry;
  const descriptors: CandidateDescriptor[] = [];

  if (typeof fallbackEntry.$ref === 'string') {
    descriptors.push(
      createRefDescriptor(
        fallbackEntry.$ref,
        describeSource(token.path, `${suffix}[$ref]`),
      ),
    );
  }

  if (Object.prototype.hasOwnProperty.call(fallbackEntry, '$value')) {
    descriptors.push(
      createValueDescriptor(
        fallbackEntry.$value,
        describeSource(token.path, `${suffix}[$value]`),
      ),
    );
  }

  if ('$fallback' in fallbackEntry && fallbackEntry.$fallback !== undefined) {
    descriptors.push(
      ...collectFallbackChainCandidates(
        fallbackEntry.$fallback,
        token,
        `${suffix}[$fallback]`,
      ),
    );
  }

  if (descriptors.length === 0) {
    return [createValueDescriptor(entry, source)];
  }

  return descriptors;
}

function collectFallbackChainCandidates(
  fallback: unknown,
  token: FlattenedToken,
  suffix: string,
): CandidateDescriptor[] {
  if (fallback === undefined) {
    return [];
  }
  if (Array.isArray(fallback)) {
    const results: CandidateDescriptor[] = [];
    fallback.forEach((entry, index) => {
      results.push(
        ...collectFallbackEntryCandidates(
          entry,
          token,
          `${suffix}[${String(index)}]`,
        ),
      );
    });
    return results;
  }
  return collectFallbackEntryCandidates(fallback, token, suffix);
}

function getCandidateDescriptors(token: FlattenedToken): CandidateDescriptor[] {
  if (typeof token.ref === 'string') {
    return [
      createRefDescriptor(token.ref, describeSource(token.path, '[$ref]')),
    ];
  }

  const raw = token.value;

  if (Array.isArray(raw)) {
    const descriptors: CandidateDescriptor[] = [];
    raw.forEach((entry, index) => {
      descriptors.push(
        ...collectFallbackEntryCandidates(
          entry,
          token,
          `[$value[${String(index)}]]`,
        ),
      );
    });
    return descriptors;
  }

  if (raw !== undefined) {
    return collectFallbackEntryCandidates(raw, token, '[$value]');
  }

  return [];
}

function resolvePointer(
  pointer: string,
  tokenMap: Map<string, FlattenedToken>,
  stack: Set<string>,
  refs: Set<string>,
): { value: unknown; type?: string; candidates: TokenValueCandidate[] } {
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
): { value: unknown; type?: string; candidates: TokenValueCandidate[] } {
  if (stack.has(token.path)) {
    const cycle = [...stack, token.path].join(' -> ');
    throw new Error(`Circular $ref chain detected: ${cycle}`);
  }

  stack.add(token.path);
  try {
    const descriptors = getCandidateDescriptors(token);
    if (descriptors.length === 0) {
      return { value: token.value, type: token.type, candidates: [] };
    }

    const candidates: TokenValueCandidate[] = [];
    let resolvedValue: unknown = undefined;
    let resolvedType: string | undefined;

    for (const descriptor of descriptors) {
      if (descriptor.kind === 'ref') {
        const pointer = canonicalizePointer(
          descriptor.ref,
          `Token ${descriptor.source}`,
          '$ref',
        );
        refs.add(pointer);
        const result = resolvePointer(pointer, tokenMap, stack, refs);
        candidates.push({ value: result.value, ref: pointer });
        if (resolvedValue === undefined) {
          resolvedValue = result.value;
          resolvedType = result.type;
        }
        continue;
      }

      candidates.push({ value: descriptor.value });
      if (resolvedValue === undefined) {
        resolvedValue = descriptor.value;
        resolvedType = token.type;
      }
    }

    return { value: resolvedValue, type: resolvedType, candidates };
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
  const { value, type, candidates } = resolveToken(
    token,
    tokenMap,
    stack,
    refs,
  );

  if (token.type && type && token.type !== type) {
    warnings.push(
      `Token ${token.path} declares type ${token.type} but resolves to ${type}`,
    );
  }

  return { value, refs: [...refs], type, candidates };
}
