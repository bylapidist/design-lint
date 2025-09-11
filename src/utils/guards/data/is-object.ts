/**
 * Checks whether a value is a non-`null` object.
 *
 * @param value - The value to test.
 * @returns `true` if the value is an object, `false` otherwise.
 *
 * @example
 * isObject({}); // => true
 * isObject(null); // => false
 */
export const isObject = (
  value: unknown,
): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null;
