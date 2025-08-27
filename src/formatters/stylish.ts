import chalk from 'chalk';
import type { LintResult } from '../core/types';

export function stylish(results: LintResult[], useColor = true): string {
  const lines: string[] = [];
  for (const res of results) {
    const file = useColor ? chalk.underline(res.filePath) : res.filePath;
    lines.push(file);
    for (const msg of res.messages) {
      const sevText = msg.severity === 'error' ? 'error' : 'warn';
      const sev = useColor
        ? msg.severity === 'error'
          ? chalk.red(sevText)
          : chalk.yellow(sevText)
        : sevText;
      lines.push(
        `  ${msg.line}:${msg.column}  ${sev}  ${msg.message}  ${msg.ruleId}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}
