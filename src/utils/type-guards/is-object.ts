/**
 * Checks whether a value is a non-null object.
 *
 * @param value - The value to test.
 * @returns `true` if the value is an object, `false` otherwise.
 */
export const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;
