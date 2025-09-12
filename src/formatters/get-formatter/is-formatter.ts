import type { Formatter } from './types.js';

/**
 * Determine if a value conforms to the {@link Formatter} signature.
 *
 * @param value - Value to test.
 * @returns Whether the value is a formatter function.
 */
export function isFormatter(value: unknown): value is Formatter {
  return typeof value === 'function';
}
