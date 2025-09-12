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
export {
  TokenRegistry,
  type TokenRegistryOptions,
} from './core/token-registry.js';
export * from './output/index.js';

export function createLinter(
  config: Config,
  env: Environment,
  onWarn?: (msg: string) => void,
): Linter {
  return setupLinter(config, env, onWarn).linter;
}

export function createLintService(
  config: Config,
  env: Environment,
  onWarn?: (msg: string) => void,
): LintService {
  return setupLinter(config, env, onWarn).service;
}
