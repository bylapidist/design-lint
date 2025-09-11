import { isArray } from './is-array.js';

/**
 * Normalizes a value to always be returned as an array.
 *
 * @typeParam T - Element type of the array.
 * @param value - The value to wrap if necessary.
 * @returns The original array or a new array containing the value.
 *
 * @example
 * toArray(1); // => [1]
 * toArray([1, 2]); // => [1, 2]
 */
export const toArray = <T>(value: T | T[]): T[] =>
  isArray<T>(value) ? value : [value];
