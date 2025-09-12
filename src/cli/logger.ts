/**
 * @packageDocumentation
 *
 * Minimal logging utilities for the CLI.
 */

import chalk from 'chalk';

/**
 * Lightweight logging utility for CLI commands.
 *
 * Provides colorized error and warning output with automatic deduplication of
 * repeated warnings.
 */
export interface Logger {
  /** Log an error message and set a non-zero exit code. */
  error: (err: unknown) => void;
  /** Emit a warning message once per unique string. */
  warn: (msg: string) => void;
}

/**
 * Create a logger instance with optional color support.
 *
 * @param getColor - Function returning whether colored output should be used.
 * @returns Logger with `error` and `warn` methods.
 */
export function createLogger(getColor: () => boolean): Logger {
  const seen = new Set<string>();
  const color = {
    red: (s: string) => (getColor() ? chalk.red(s) : s),
    yellow: (s: string) => (getColor() ? chalk.yellow(s) : s),
  };

  return {
    error(err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(color.red(message));
      process.exitCode ??= 1;
    },
    warn(msg: string) {
      if (seen.has(msg)) return;
      seen.add(msg);
      console.warn(color.yellow(msg));
    },
  };
}
