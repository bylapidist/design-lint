/**
 * Determines whether a value is an array.
 *
 * @param value - The value to test.
 * @returns `true` if the value is an array, `false` otherwise.
 */
export const isArray = (value: unknown): value is unknown[] =>
  Array.isArray(value);
