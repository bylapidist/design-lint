import type { LintResult } from '../core/types.js';
import { stylish } from './stylish.js';
import { jsonFormatter } from './json.js';
import { sarifFormatter } from './sarif.js';

type Formatter = (results: LintResult[], useColor?: boolean) => string;

/**
 * Retrieve a formatter by name.
 * @param name Formatter identifier.
 * @returns Formatter function for rendering results.
 */
export function getFormatter(name: string): Formatter {
  switch (name) {
    case 'stylish':
      return stylish;
    case 'json':
      return jsonFormatter;
    case 'sarif':
      return sarifFormatter;
    default:
      throw new Error(`Unknown formatter: ${name}`);
  }
}
