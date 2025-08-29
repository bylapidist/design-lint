import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import type { LintResult } from '../core/types.js';
import { stylish } from './stylish.js';
import { jsonFormatter } from './json.js';
import { sarifFormatter } from './sarif.js';

type Formatter = (results: LintResult[], useColor?: boolean) => string;

const requireFromCwd = createRequire(path.join(process.cwd(), 'noop.js'));

/**
 * Retrieve a formatter by name.
 * @param name Formatter identifier or module path.
 * @returns Promise resolving to a formatter function.
 */
export async function getFormatter(name: string): Promise<Formatter> {
  switch (name) {
    case 'stylish':
      return stylish;
    case 'json':
      return jsonFormatter;
    case 'sarif':
      return sarifFormatter;
    default: {
      try {
        const resolved = requireFromCwd.resolve(name);
        const mod = await import(pathToFileURL(resolved).href);
        const formatter = (mod.default ?? mod.formatter ?? mod) as Formatter;
        if (typeof formatter !== 'function') {
          throw new Error();
        }
        return formatter;
      } catch {
        throw new Error(`Unknown formatter: ${name}`);
      }
    }
  }
}
