/**
 * @packageDocumentation
 *
 * Retrieve formatter implementations by name or path.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Formatter } from './types.js';
import { resolveFormatter } from './resolve-formatter.js';
import { builtInFormatters, isBuiltInFormatterName } from './builtins.js';

/**
 * Retrieve a formatter by name.
 *
 * @param name - Formatter identifier or module path.
 * @returns Promise resolving to a formatter function.
 *
 * @example
 * ```ts
 * const formatter = await getFormatter('json');
 * const out = formatter(results);
 * ```
 *
 * @example
 * ```ts
 * const formatter = await getFormatter('./custom-formatter.js');
 * const out = formatter(results);
 * ```
 */
export async function getFormatter(name: string): Promise<Formatter> {
  if (isBuiltInFormatterName(name)) {
    const formatter = builtInFormatters.get(name);
    if (formatter) {
      return formatter;
    }
  }
  try {
    const resolved =
      path.isAbsolute(name) || name.startsWith('./') || name.startsWith('../')
        ? pathToFileURL(path.resolve(process.cwd(), name)).href
        : import.meta.resolve(
            name,
            pathToFileURL(path.join(process.cwd(), 'index.js')).href,
          );
    const mod: unknown = await import(resolved);
    const formatter = resolveFormatter(mod);
    if (!formatter) {
      throw new Error();
    }
    return formatter;
  } catch {
    throw new Error(`Unknown formatter: ${name}`);
  }
}
