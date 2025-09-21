import type { TokenGroup } from '../../../core/types.js';
import { isRecord } from '../data/index.js';
import { isToken } from './is-token.js';

/**
 * Recursively determines whether a value is a DTIF token collection.
 *
 * A collection has no `$value` or `$ref` of its own and its non-reserved members
 * are other tokens or collections.
 *
 * @param value - Value to examine.
 * @returns `true` if the value is a token collection.
 */
export function isTokenGroup(value: unknown): value is TokenGroup {
  if (!isRecord(value)) return false;
  if ('$value' in value || '$ref' in value) return false;
  if ('$type' in value) return false;
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith('$')) continue;
    if (!isToken(val) && !isTokenGroup(val)) return false;
  }
  return true;
}
