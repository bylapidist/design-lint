/**
 * @packageDocumentation
 *
 * Helper for defining configuration objects with full TypeScript support.
 */
import type { Config } from '../core/linter.js';

/**
 * Defines a type-safe configuration object.
 *
 * Used in user configuration files to benefit from TypeScript inference while
 * simply returning the provided object at runtime.
 *
 * @param config - Configuration object.
 * @returns The provided configuration unchanged.
 *
 * @example
 * ```ts
 * // designlint.config.ts
 * export default defineConfig({
 *   rules: { 'design/no-unknown': 'error' },
 * });
 * ```
 */
export function defineConfig(config: Config): Config {
  return config;
}
