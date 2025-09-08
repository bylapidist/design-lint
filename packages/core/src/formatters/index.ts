import { pathToFileURL } from 'node:url';
import type { LintResult } from '../core/types.js';
import { stylish } from './stylish.js';
import { jsonFormatter } from './json.js';
import { sarifFormatter } from './sarif.js';
import type { Env } from '@lapidist/design-lint-shared';
import { nodeEnv } from '@lapidist/design-lint-shared';

type Formatter = (results: LintResult[], useColor?: boolean) => string;

/**
 * Retrieve a formatter by name.
 * @param name Formatter identifier or module path.
 * @param env Environment adapters.
 * @returns Promise resolving to a formatter function.
 */
export async function getFormatter(
  name: string,
  env: Env = nodeEnv,
): Promise<Formatter> {
  switch (name) {
    case 'stylish':
      return stylish;
    case 'json':
      return jsonFormatter;
    case 'sarif':
      return sarifFormatter;
    default: {
      try {
        const resolved =
          env.path.isAbsolute(name) ||
          name.startsWith('./') ||
          name.startsWith('../')
            ? pathToFileURL(env.path.resolve(process.cwd(), name)).href
            : import.meta.resolve(
                name,
                pathToFileURL(env.path.join(process.cwd(), 'index.js')).href,
              );
        const mod = (await import(resolved)) as unknown;
        const formatter = resolveFormatter(mod);
        if (!formatter) {
          throw new Error();
        }
        return formatter;
      } catch {
        throw new Error(`Unknown formatter: ${name}`);
      }
    }
  }
}

function resolveFormatter(mod: unknown): Formatter | undefined {
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

function isFormatter(value: unknown): value is Formatter {
  return typeof value === 'function';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
