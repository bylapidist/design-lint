/**
 * Determines whether a value is an array.
 *
 * @typeParam T - Expected element type of the array.
 * @param value - The value to test.
 * @returns `true` if the value is an array, `false` otherwise.
 *
 * @example
 * isArray([]); // => true
 * isArray('foo'); // => false
 */
export const isArray = <T = unknown>(value: unknown): value is T[] =>
  Array.isArray(value);
