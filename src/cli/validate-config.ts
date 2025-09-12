import { loadConfig } from '../config/loader.js';
import type { Logger } from './logger.js';

interface ValidateOptions {
  config?: string;
}

export async function validateConfig(
  options: ValidateOptions,
  logger: Logger,
): Promise<void> {
  const originalWarn = console.warn;

  function proxyWarn(...args: unknown[]): void {
    console.warn = originalWarn;
    try {
      logger.warn(args.map(String).join(' '));
    } finally {
      console.warn = proxyWarn;
    }
  }

  console.warn = proxyWarn;
  try {
    await loadConfig(process.cwd(), options.config);
    console.log('Configuration is valid');
  } finally {
    console.warn = originalWarn;
  }
}
