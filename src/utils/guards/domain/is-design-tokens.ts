import type { DesignTokens } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

/**
 * Determines whether a value conforms to the `DesignTokens` structure.
 *
 * Currently this simply checks whether the value is a record. Additional
 * validation may be layered on in the future.
 *
 * @param value - The value to test.
 * @returns `true` if the value is a `DesignTokens` object.
 *
 * @example
 * isDesignTokens({ color: { red: { $value: '#f00' } } }); // => true
 */
export const isDesignTokens = (value: unknown): value is DesignTokens =>
  isRecord(value);
