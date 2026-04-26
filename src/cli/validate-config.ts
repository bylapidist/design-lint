import path from 'node:path';
import { loadConfig } from '../config/loader.js';
import { loadPolicy } from '../config/policy-loader.js';
import { enforcePolicy } from '../config/policy-enforcer.js';
import { FileSource } from '../adapters/node/file-source.js';
import { createLinter } from '../index.js';
import { getFormatter } from '../formatters/index.js';
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
    const cwd = process.cwd();
    const config = await loadConfig(cwd, options.config);
    await getFormatter(config.format ?? 'stylish');
    // validate-config only checks rule configuration — no token loading required.
    const linter = createLinter(config, { documentSource: new FileSource() });
    await linter.hasRunLevelRules();

    // Enforce policy if a designlint.policy.json is present
    const configDir = config.configPath ? path.dirname(config.configPath) : cwd;
    const policy = loadPolicy(configDir);
    if (policy !== undefined) {
      enforcePolicy(config, policy);
    }

    console.log('Configuration is valid');
  } finally {
    console.warn = originalWarn;
  }
}
