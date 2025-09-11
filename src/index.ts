import {
  Linter,
  LintService,
  setupLinter,
  type Config,
  type Environment,
} from './core/index';

export * from './core/index';
export * from './adapters/node/index';
export { loadConfig } from './config/loader';
export { defineConfig } from './config/define-config';
export { getFormatter } from './formatters/index';
export { builtInRules } from './rules/index';

export function createLinter(config: Config, env: Environment): Linter {
  return setupLinter(config, env).linter;
}

export function createLintService(
  config: Config,
  env: Environment,
): LintService {
  return setupLinter(config, env).service;
}
