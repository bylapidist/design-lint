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

const WARNED_UNTRUSTED_FORMATTER_KEY = Symbol.for(
  'design-lint.warned.untrusted-formatter-loader',
);

function warnUntrustedFormatterLoad(): void {
  if (Reflect.get(globalThis, WARNED_UNTRUSTED_FORMATTER_KEY) === true) {
    return;
  }
  Reflect.set(globalThis, WARNED_UNTRUSTED_FORMATTER_KEY, true);
  process.emitWarning(
    'Loading custom design-lint formatters executes arbitrary code. Only load trusted formatter modules.',
    {
      code: 'DESIGN_LINT_UNTRUSTED_FORMATTER',
      type: 'SecurityWarning',
    },
  );
}

function getResolutionTarget(name: string): string {
  if (
    path.isAbsolute(name) ||
    name.startsWith('./') ||
    name.startsWith('../')
  ) {
    return pathToFileURL(path.resolve(process.cwd(), name)).href;
  }

  return import.meta.resolve(
    name,
    pathToFileURL(path.join(process.cwd(), 'index.js')).href,
  );
}

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

  let resolved: string;
  try {
    resolved = getResolutionTarget(name);
  } catch {
    throw new Error(`Unknown formatter: ${name}`);
  }

  let mod: unknown;
  try {
    warnUntrustedFormatterLoad();
    mod = await import(resolved);
  } catch (error) {
    if (error instanceof Error) {
      const formatterError = new Error(
        `Failed to load formatter "${name}": ${error.message}`,
      );
      if (error.stack) {
        formatterError.stack = `${formatterError.stack ?? formatterError.message}
Caused by: ${error.stack}`;
      }
      throw formatterError;
    }

    throw new Error(`Failed to load formatter "${name}": ${String(error)}`);
  }

  const formatter = resolveFormatter(mod);
  if (!formatter) {
    throw new Error(
      `Formatter module "${name}" does not export a valid formatter function`,
    );
  }

  return formatter;
}
