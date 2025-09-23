/**
 * @packageDocumentation
 *
 * Utilities for resolving, loading and validating design-lint configuration
 * and associated design tokens.
 *
 * - `ConfigTokenProvider` – exposes a `load` method to normalize inline token
 *   objects into theme records.
 * - `defineConfig` – helper for authoring type-safe `designlint.config` files.
 * - `resolveConfigFile` – searches for configuration files on disk.
 * - `loadConfig` – high-level loader that resolves, validates and normalizes
 *   configuration.
 * - `normalizeTokens` – asynchronously ensures design token inputs conform to a
 *   theme record.
 * - `configSchema` – [Zod](https://zod.dev/) schema describing valid
 *   configuration.
 * - `wrapTokenError` – attaches theme context to low-level token errors.
 * - `loadTokens` – reads and validates design tokens from files or inline
 *   definitions.
 */

export * from './config-token-provider.js';
export * from './define-config.js';
export * from './file-resolution.js';
export * from './loader.js';
export * from './constants.js';
export { normalizeTokens } from '../utils/tokens/index.js';
export * from './schema.js';
export * from './token-loader.js';
export { wrapTokenError } from '../utils/tokens/index.js';
