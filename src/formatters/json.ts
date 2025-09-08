import type { LintResult } from '../engine/types.js';

export function jsonFormatter(results: LintResult[], _useColor = true): string {
  void _useColor;
  return JSON.stringify(results, null, 2);
}
