import type { Token } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

/**
 * Determines whether a value represents a single design token.
 *
 * A token is any object that exposes either a `$value` or `$ref` property.
 *
 * @param value - Value to examine.
 * @returns `true` if the value is a token object.
 *
 * @example
 * isToken({ $value: '#f00' }); // => true
 * isToken({ $ref: '#/color/red' }); // => true
 */
export const isToken = (value: unknown): value is Token =>
  isRecord(value) && ('$value' in value || '$ref' in value);
