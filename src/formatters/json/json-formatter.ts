/**
 * @packageDocumentation
 *
 * JSON formatter implementation.
 */

import type { LintResult } from '../../core/types.js';

/**
 * Convert lint results to a prettified JSON string.
 *
 * @param results - Results to serialize.
 * @param _useColor - Ignored. Present for API parity with other formatters.
 * @returns JSON representation of the results.
 *
 * @example
 * ```ts
 * const out = jsonFormatter(results);
 * console.log(out);
 * ```
 */
export function jsonFormatter(results: LintResult[], _useColor = true): string {
  void _useColor;
  return JSON.stringify(results, null, 2);
}
