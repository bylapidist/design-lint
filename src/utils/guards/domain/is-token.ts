import type { Token } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

/**
 * Determines whether a value represents a DTIF design token.
 *
 * A token exposes either a `$value` or `$ref` field alongside optional metadata.
 *
 * @param value - Value to examine.
 * @returns `true` if the value is a token object.
 */
export const isToken = (value: unknown): value is Token =>
  isRecord(value) && ('$value' in value || '$ref' in value);
