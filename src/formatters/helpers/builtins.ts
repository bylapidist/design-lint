/**
 * @packageDocumentation
 *
 * Utilities for working with bundled formatter implementations.
 */

import type { Formatter } from './types.js';
import { stylishFormatter } from '../stylish/index.js';
import { jsonFormatter } from '../json/index.js';
import { sarifFormatter } from '../sarif/index.js';

/**
 * Tuples mapping built-in formatter names to implementations.
 */
const builtInFormatterEntries = [
  ['stylish', stylishFormatter],
  ['json', jsonFormatter],
  ['sarif', sarifFormatter],
] as const;

/**
 * Names of bundled formatter implementations.
 */
export type BuiltInFormatterName = (typeof builtInFormatterEntries)[number][0];

/**
 * Ordered list of built-in formatter identifiers.
 *
 * @example
 * ```ts
 * for (const name of builtInFormatterNames) {
 *   console.log(name);
 * }
 * ```
 */
export const builtInFormatterNames =
  builtInFormatterEntries.map<BuiltInFormatterName>(([name]) => name);

/**
 * Mapping of built-in formatter names to their implementations.
 *
 * @example
 * ```ts
 * const formatter = builtInFormatters.get('json');
 * formatter?.([], true);
 * ```
 */
export const builtInFormatters = new Map<BuiltInFormatterName, Formatter>(
  builtInFormatterEntries,
);

/**
 * Determine whether a formatter name refers to a bundled implementation.
 *
 * @param name - Name to test.
 * @returns True if `name` is a built-in formatter identifier.
 *
 * @example
 * isBuiltInFormatterName('json');
 * // => true
 * isBuiltInFormatterName('custom');
 * // => false
 */
export function isBuiltInFormatterName(
  name: string,
): name is BuiltInFormatterName {
  return builtInFormatterEntries.some(([n]) => n === name);
}
