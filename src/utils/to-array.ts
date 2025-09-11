import { isArray } from './is-array.js';

/**
 * Normalizes a value to always be returned as an array.
 *
 * @param value - The value to wrap if necessary.
 * @returns The original array or a new array containing the value.
 */
export const toArray = <T>(value: T | T[]): T[] =>
  isArray(value) ? value : [value];
