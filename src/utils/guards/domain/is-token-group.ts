import type { TokenGroup } from '../../../core/types.js';
import { isRecord } from '../data/index.js';
import { isToken } from './is-token.js';

/**
 * Recursively determines whether a value is a W3C Design Tokens group.
 *
 * A token group is an object whose non-metadata properties are either tokens
 * or other token groups.
 *
 * @param value - Value to examine.
 * @returns `true` if the value is a token group.
 *
 * @example
 * isTokenGroup({ color: { red: { $value: '#f00' } } }); // => true
 */
export function isTokenGroup(value: unknown): value is TokenGroup {
  if (!isRecord(value)) return false;
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith('$')) continue;
    if (!isToken(val) && !isTokenGroup(val)) return false;
  }
  return true;
}
