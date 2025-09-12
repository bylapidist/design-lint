import type { Token } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

/**
 * Determines whether a value represents a single design token.
 *
 * A token is any object that exposes a `$value` property.
 *
 * @param value - Value to examine.
 * @returns `true` if the value is a token object.
 *
 * @example
 * isToken({ $value: '#f00' }); // => true
 */
export const isToken = (value: unknown): value is Token =>
  isRecord(value) && '$value' in value;
