import chalk from 'chalk';
import type { LintResult } from '../core/types';

export function stylish(results: LintResult[]): string {
  const lines: string[] = [];
  for (const res of results) {
    lines.push(chalk.underline(res.filePath));
    for (const msg of res.messages) {
      const sev =
        msg.severity === 'error' ? chalk.red('error') : chalk.yellow('warn');
      lines.push(
        `  ${msg.line}:${msg.column}  ${sev}  ${msg.message}  ${msg.ruleId}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}
