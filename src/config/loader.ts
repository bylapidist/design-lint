/**
 * @packageDocumentation
 *
 * High-level loader for resolving and validating configuration files.
 */
import path from 'node:path';
import { collections, guards } from '../utils/index.js';
import type { Config } from '../core/linter.js';
import { configSchema } from './schema.js';
import { realpathIfExists } from '../adapters/node/utils/paths.js';
import { resolveConfigFiles } from './file-resolution.js';
import { loadTokens } from './token-loader.js';
import { ConfigError } from '../core/errors.js';
import { isConfigArrayMergeKey } from './constants.js';

const {
  data: { isRecord },
} = guards;

const { asArray } = collections;

const mergeArrayValues = (current: unknown, incoming: unknown[]): unknown[] => [
  ...asArray(current),
  ...incoming,
];

/**
 * Resolve and load configuration for the linter.
 *
 * Combines the base defaults with any discovered configuration file, validates
 * the result against {@link configSchema} and normalizes token references.
 *
 * @param cwd - Current working directory.
 * @param configPath - Optional explicit config path.
 * @returns Parsed and validated config object.
 * @throws {ConfigError} If the configuration fails validation.
 * @throws {Error} If token loading fails.
 *
 * @example
 * ```ts
 * const config = await loadConfig(process.cwd());
 * console.log(config.rules);
 * ```
 */
export async function loadConfig(
  cwd: string,
  configPath?: string,
): Promise<Config> {
  const results = await resolveConfigFiles(cwd, configPath);
  const nearestConfig =
    results.length > 0 ? results[results.length - 1] : undefined;

  const baseConfig: Record<string, unknown> = {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    configPath: nearestConfig?.filepath
      ? realpathIfExists(nearestConfig.filepath)
      : undefined,
    configSources: results.map((entry) => realpathIfExists(entry.filepath)),
  };

  const merged = results.reduce<Record<string, unknown>>((acc, result) => {
    if (!isRecord(result.config)) {
      return acc;
    }

    const next = { ...acc };
    for (const [key, value] of Object.entries(result.config)) {
      if (isConfigArrayMergeKey(key) && Array.isArray(value)) {
        next[key] = mergeArrayValues(acc[key], value);
        continue;
      }
      next[key] = value;
    }
    return next;
  }, baseConfig);

  const parsed = configSchema.safeParse(merged);
  if (!parsed.success) {
    const location = nearestConfig?.filepath
      ? ` at ${nearestConfig.filepath}`
      : '';
    throw new ConfigError({
      message: `Invalid config${location}: ${parsed.error.message}`,
      context: nearestConfig?.filepath
        ? `Config file "${nearestConfig.filepath}"`
        : 'Config',
      remediation: 'Review and fix the configuration file.',
    });
  }
  const config = parsed.data;
  if (isRecord(config.tokens) && Object.keys(config.tokens).length > 0) {
    const baseDir = config.configPath ? path.dirname(config.configPath) : cwd;
    config.tokens = await loadTokens(config.tokens, baseDir);
  }
  return config;
}
