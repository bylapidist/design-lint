import type { LintResult } from '../core/types.js';

const codes = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  underline: (s: string) => `\x1b[4m${s}\x1b[0m`,
};

export function stylish(results: LintResult[], useColor = true): string {
  const lines: string[] = [];
  let errorCount = 0;
  let warnCount = 0;
  for (const res of results) {
    lines.push(useColor ? codes.underline(res.filePath) : res.filePath);
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
      lines.push(
        `  ${msg.line}:${msg.column}  ${sev}  ${msg.message}${suggestion}  ${msg.ruleId}`,
      );
    }
    lines.push('');
  }
  const total = errorCount + warnCount;
  if (total > 0) {
    const summary = `${total} problems (${errorCount} errors, ${warnCount} warnings)`;
    if (useColor) {
      const color = errorCount > 0 ? codes.red : codes.yellow;
      lines.push(color(summary));
    } else {
      lines.push(summary);
    }
  }
  return lines.join('\n');
}
