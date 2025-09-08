import type { LintResult } from '@lapidist/design-lint-core';

export function jsonFormatter(results: LintResult[], _useColor = true): string {
  void _useColor;
  return JSON.stringify(results, null, 2);
}
