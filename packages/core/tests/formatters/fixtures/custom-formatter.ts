import type { LintResult } from '../../../src/index.ts';

export default function customFormatter(results: LintResult[]): string {
  return `custom:${String(results.length)}`;
}
