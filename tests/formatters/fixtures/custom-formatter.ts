import type { LintResult } from '../../../src/core/types.ts';

export default function customFormatter(results: LintResult[]): string {
  return `custom:${results.length}`;
}
