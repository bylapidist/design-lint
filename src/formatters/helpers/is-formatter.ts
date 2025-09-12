/**
 * @packageDocumentation
 *
 * Type guard for formatter functions.
 */

import type { Formatter } from './types.js';

/**
 * Determine if a value conforms to the {@link Formatter} signature.
 *
 * @param value - Value to test.
 * @returns Whether the value is a formatter function.
 *
 * @example
 * isFormatter(() => '');
 * // => true
 * isFormatter('not a function');
 * // => false
 */
export function isFormatter(value: unknown): value is Formatter {
  return typeof value === 'function';
}
