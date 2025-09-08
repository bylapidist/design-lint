import type { LintResult } from '../../../packages/core/src/core/types.ts';

export default function customFormatter(results: LintResult[]): string {
  return `custom:${String(results.length)}`;
}
