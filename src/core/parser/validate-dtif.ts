import type { DesignTokens } from '../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneTokens<T>(value: T): T {
  if (typeof globalThis.structuredClone !== 'function') {
    throw new Error('structuredClone is not available in this environment');
  }
  return globalThis.structuredClone(value);
}

function canonicalizeToken(
  token: Record<string, unknown>,
  inheritedType?: string,
): void {
  if (token.$type === undefined && inheritedType !== undefined) {
    token.$type = inheritedType;
  }
}

function canonicalizeCollection(
  node: Record<string, unknown>,
  inheritedType?: string,
): void {
  const ownType = typeof node.$type === 'string' ? node.$type : undefined;
  if (ownType !== undefined && !('$value' in node) && !('$ref' in node)) {
    delete node.$type;
  }
  const nextType = ownType ?? inheritedType;

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) {
      continue;
    }
    if (!isRecord(value)) {
      continue;
    }
    const hasTokenFields = '$value' in value || '$ref' in value;
    const childKeys = Object.keys(value).filter(
      (childKey) => !childKey.startsWith('$'),
    );
    if (hasTokenFields || childKeys.length === 0) {
      canonicalizeToken(value, nextType);
    } else {
      canonicalizeCollection(value, nextType);
    }
  }
}

function canonicalizeTree<T extends Record<string, unknown>>(tokens: T): T {
  const clone = cloneTokens(tokens);
  canonicalizeCollection(clone);
  return clone;
}

export function canonicalizeDesignTokens(tokens: DesignTokens): DesignTokens {
  return canonicalizeTree(tokens);
}
