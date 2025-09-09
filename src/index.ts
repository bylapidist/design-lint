import { Linter, type Config } from './core/linter.js';
import type { Environment } from './core/environment.js';

export * from './core/index.js';
export * from './adapters/node/index.js';
export { loadConfig } from './config/loader.js';
export { defineConfig } from './config/define-config.js';
export { getFormatter } from './formatters/index.js';
export { builtInRules } from './rules/index.js';

export function createLinter(config: Config, env: Environment): Linter {
  return new Linter(config, env);
}
