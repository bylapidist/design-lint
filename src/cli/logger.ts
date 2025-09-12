import chalk from 'chalk';

export interface Logger {
  error: (err: unknown) => void;
  warn: (msg: string) => void;
}

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
