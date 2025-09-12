import type { LintResult } from '../../core/types.js';
import { relFromCwd } from '../../adapters/node/utils/paths.js';

/**
 * ANSI color code helpers for terminal styling.
 */
const codes = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  underline: (s: string) => `\x1b[4m${s}\x1b[0m`,
};

/**
 * Render lint results in a human-friendly text format.
 *
 * @param results - Lint results to format.
 * @param useColor - Whether ANSI color codes should be applied.
 * @returns A formatted string for console output.
 */
export function stylishFormatter(
  results: LintResult[],
  useColor = true,
): string {
  const lines: string[] = [];
  let errorCount = 0;
  let warnCount = 0;
  for (const res of results) {
    const filePath = relFromCwd(res.sourceId);
    if (res.messages.length === 0) {
      const ok = useColor ? codes.green('[OK]') : '[OK]';
      lines.push(`${ok} ${filePath}`);
      continue;
    }
    lines.push(useColor ? codes.underline(filePath) : filePath);
    for (const msg of res.messages) {
      if (msg.severity === 'error') errorCount++;
      else warnCount++;
      const sevText = msg.severity === 'error' ? 'error' : 'warn';
      const sev = useColor
        ? msg.severity === 'error'
          ? codes.red(sevText)
          : codes.yellow(sevText)
        : sevText;
      const suggestion = msg.suggest ? ` Did you mean \`${msg.suggest}\`?` : '';
      const category = res.ruleCategories?.[msg.ruleId];
      lines.push(
        `  ${String(msg.line)}:${String(msg.column)}  ${sev}  ${msg.message}${suggestion}  ${msg.ruleId}${
          category ? ` (${category})` : ''
        }`,
      );
    }
  }
  const total = errorCount + warnCount;
  if (total > 0) {
    const summary = `${String(total)} problems (${String(errorCount)} errors, ${String(warnCount)} warnings)`;
    lines.push(useColor ? codes.red(summary) : summary);
  }
  return lines.join('\n');
}
