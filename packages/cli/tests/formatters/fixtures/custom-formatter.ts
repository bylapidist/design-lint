import type { LintResult } from '@lapidist/design-lint-core';

export default function customFormatter(results: LintResult[]): string {
  return `custom:${String(results.length)}`;
}
