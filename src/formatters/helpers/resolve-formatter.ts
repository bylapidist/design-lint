/**
 * @packageDocumentation
 *
 * Resolve formatter exports from dynamic modules.
 */

import { guards } from '../../utils/index.js';
import type { Formatter } from './types.js';
import { isFormatter } from './is-formatter.js';

const {
  data: { isRecord },
} = guards;

/**
 * Extract a formatter export from a dynamically imported module.
 *
 * @param mod - Candidate module object.
 * @returns The formatter function if found.
 *
 * @example
 * ```ts
 * const mod = { default: () => '' };
 * const formatter = resolveFormatter(mod);
 * formatter?.([], true);
 * ```
 */
export function resolveFormatter(mod: unknown): Formatter | undefined {
  if (isFormatter(mod)) {
    return mod;
  }
  if (isRecord(mod)) {
    if (isFormatter(mod.default)) {
      return mod.default;
    }
    if (isFormatter(mod.formatter)) {
      return mod.formatter;
    }
  }
  return undefined;
}
