import type { LintResult } from '../../../src/engine/types.ts';

export default function customFormatter(results: LintResult[]): string {
  return `custom:${String(results.length)}`;
}
