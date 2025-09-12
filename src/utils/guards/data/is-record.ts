import { isObject } from './is-object.js';
import { isArray } from '../../collections/index.js';

/**
 * Determines whether a value is a plain object (i.e., a record) and not an array.
 *
 * @param value - The value to test.
 * @returns `true` if the value is a record, `false` otherwise.
 *
 * @example
 * isRecord({ a: 1 }); // => true
 * isRecord([1, 2]); // => false
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  isObject(value) && !isArray(value);
