import type { LintResult } from '../core/types';
import { stylish } from './stylish';
import { jsonFormatter } from './json';
import { sarifFormatter } from './sarif';

type Formatter = (results: LintResult[]) => string;

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
