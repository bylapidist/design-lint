import type { DesignTokens } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

const RESERVED_PREFIX = '$';

/**
 * Determines whether a value conforms to the DTIF `DesignTokens` structure.
 *
 * The guard ensures top-level members are either metadata (prefixed with `$`)
 * or nested collections/tokens that eventually declare a `$value` or `$ref`
 * entry.
 */
export const isDesignTokens = (value: unknown): value is DesignTokens =>
  isTokenCollection(value);

function isTokenCollection(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key.startsWith(RESERVED_PREFIX)) {
      continue;
    }

    if (isTokenNode(entry)) {
      continue;
    }

    if (isTokenCollection(entry)) {
      continue;
    }

    return false;
  }

  return true;
}

function isTokenNode(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  if ('$value' in value) {
    return true;
  }

  if ('$ref' in value) {
    return true;
  }

  return false;
}
