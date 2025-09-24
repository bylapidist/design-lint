import type { TokenNode } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

/**
 * Determines whether a value represents a single DTIF design token.
 *
 * A token is any object that exposes a `$value` or `$ref` property.
 *
 * @param value - Value to examine.
 * @returns `true` if the value is a token object.
 *
 * @example
 * isToken({
 *   $value: { colorSpace: 'srgb', components: [1, 0, 0] },
 * }); // => true
 * isToken({ $ref: '#/color/primary' }); // => true
 */
export const isToken = (value: unknown): value is TokenNode =>
  isRecord(value) && ('$value' in value || '$ref' in value);
