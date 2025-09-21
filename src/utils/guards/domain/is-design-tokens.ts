import type { DesignTokens } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

/**
 * Determines whether a value resembles a DTIF design token document.
 *
 * Currently this simply checks whether the value is a record. Full DTIF
 * validation is deferred to the dedicated validator.
 *
 * @param value - The value to test.
 * @returns `true` if the value is a design token record.
 *
 * @example
 * isDesignTokens({ color: { red: { $value: '#f00' } } }); // => true
 */
export const isDesignTokens = (value: unknown): value is DesignTokens =>
  isRecord(value);
