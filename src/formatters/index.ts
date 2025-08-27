import type { LintResult } from '../core/types';
import { stylish } from './stylish';
import { jsonFormatter } from './json';
import { sarifFormatter } from './sarif';

type Formatter = (results: LintResult[]) => string;

export function getFormatter(name: string): Formatter {
  switch (name) {
    case 'json':
      return jsonFormatter;
    case 'sarif':
      return sarifFormatter;
    default:
      return stylish;
  }
}
