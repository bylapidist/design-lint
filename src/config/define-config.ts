import type { Config } from '../engine/linter.js';

/**
 * Helper to define a configuration object with type checking.
 * @param config Configuration object.
 * @returns The provided configuration.
 */
export function defineConfig(config: Config): Config {
  return config;
}
