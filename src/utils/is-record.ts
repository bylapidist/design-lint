import { isObject } from './is-object';

/**
 * Determines whether a value is a plain object (i.e., a record) and not an array.
 *
 * @param value - The value to test.
 * @returns `true` if the value is a record, `false` otherwise.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  isObject(value) && !Array.isArray(value);
