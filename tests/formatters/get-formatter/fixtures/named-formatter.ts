import type { LintResult } from '../../../src/core/types.js';

export const formatter = (results: LintResult[]): string =>
  `named:${String(results.length)}`;
