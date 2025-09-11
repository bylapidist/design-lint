import {
  Linter,
  LintService,
  setupLinter,
  type Config,
  type Environment,
} from './core/index.js';

export * from './core/index.js';
export * from './adapters/node/index.js';
export { loadConfig } from './config/loader.js';
export { defineConfig } from './config/define-config.js';
export { getFormatter } from './formatters/index.js';
export { builtInRules } from './rules/index.js';

export function createLinter(config: Config, env: Environment): Linter {
  return setupLinter(config, env).linter;
}

export function createLintService(
  config: Config,
  env: Environment,
): LintService {
  return setupLinter(config, env).service;
}
