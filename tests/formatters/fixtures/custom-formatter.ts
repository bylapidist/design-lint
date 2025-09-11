import type { LintResult } from '../../../src/core/types.js';

export default function customFormatter(results: LintResult[]): string {
  return `custom:${String(results.length)}`;
}
