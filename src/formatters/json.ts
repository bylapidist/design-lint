import type { LintResult } from '../core/types';

export function jsonFormatter(results: LintResult[], _useColor = true): string {
  void _useColor;
  return JSON.stringify(results, null, 2);
}
