import type { LintResult } from '../core/types';

export function jsonFormatter(results: LintResult[]): string {
  return JSON.stringify(results, null, 2);
}
