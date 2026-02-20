import { isArray } from './is-array.js';

/**
 * Returns the value when it is an array, otherwise an empty array.
 *
 * @typeParam T - Expected element type.
 * @param value - Value to normalize.
 * @returns The original array or an empty array.
 */
export const asArray = <T = unknown>(value: unknown): T[] =>
  isArray<T>(value) ? [...value] : [];
