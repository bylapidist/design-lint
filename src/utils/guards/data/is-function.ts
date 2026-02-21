/**
 * Checks whether a value is callable.
 *
 * @param value - Value to inspect.
 * @returns `true` when the value is a function.
 */
export const isFunction = (
  value: unknown,
): value is (...args: never[]) => unknown => typeof value === 'function';
