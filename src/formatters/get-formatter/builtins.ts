import type { Formatter } from './types.js';
import { stylishFormatter } from '../stylish/index.js';
import { jsonFormatter } from '../json/index.js';
import { sarifFormatter } from '../sarif/index.js';

/**
 * Names of bundled formatter implementations.
 */
export type BuiltInFormatterName = 'stylish' | 'json' | 'sarif';

/**
 * Entries mapping built-in formatter names to implementations.
 */
const builtInFormatterEntries = [
  ['stylish', stylishFormatter],
  ['json', jsonFormatter],
  ['sarif', sarifFormatter],
] as const satisfies readonly (readonly [BuiltInFormatterName, Formatter])[];

/**
 * Mapping of built-in formatter names to their implementations.
 *
 * @internal
 */
export const builtInFormatters = new Map<BuiltInFormatterName, Formatter>(
  builtInFormatterEntries,
);

/**
 * Determine whether a formatter name refers to a bundled implementation.
 *
 * @param name - Name to test.
 * @returns True if `name` is a built-in formatter identifier.
 */
export function isBuiltInFormatterName(
  name: string,
): name is BuiltInFormatterName {
  return builtInFormatterEntries.some(([n]) => n === name);
}
