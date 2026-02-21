/* c8 ignore start */
import {
  Linter,
  LintService,
  setupLinter,
  type Config,
  type Environment,
  type DocumentSource,
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

type EnvInput = Environment | DocumentSource;

function toEnvironment(env: EnvInput): Environment {
  if ('documentSource' in env) {
    return env;
  }
  return { documentSource: env };
}

export function createLinter(config: Config, env: EnvInput): Linter {
  return setupLinter(config, toEnvironment(env)).linter;
}

export function createLintService(config: Config, env: EnvInput): LintService {
  return setupLinter(config, toEnvironment(env)).service;
}
/* c8 ignore stop */
