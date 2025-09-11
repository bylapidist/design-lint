import path from 'node:path';
import type { Config } from '../core/linter.js';
import { configSchema } from './schema.js';
import { realpathIfExists } from '../adapters/node/utils/paths.js';
import { resolveConfigFile } from './file-resolution.js';
import { loadTokens } from './token-loader.js';
import { isRecord } from '../utils/type-guards.js';
import { ConfigError } from '../core/errors.js';

/**
 * Resolve and load configuration for the linter.
 * @param cwd Current working directory.
 * @param configPath Optional explicit config path.
 * @returns Parsed and validated config object.
 */
export async function loadConfig(
  cwd: string,
  configPath?: string,
): Promise<Config> {
  const result = await resolveConfigFile(cwd, configPath);

  const base: Config = {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    configPath: result?.filepath
      ? realpathIfExists(result.filepath)
      : undefined,
  };
  const merged = {
    ...base,
    ...(isRecord(result?.config) ? result.config : {}),
  };
  const parsed = configSchema.safeParse(merged);
  if (!parsed.success) {
    const location = result?.filepath ? ` at ${result.filepath}` : '';
    throw new ConfigError({
      message: `Invalid config${location}: ${parsed.error.message}`,
      context: result?.filepath ? `Config file "${result.filepath}"` : 'Config',
      remediation: 'Review and fix the configuration file.',
    });
  }
  const config = parsed.data;
  if (config.tokens && typeof config.tokens === 'object') {
    const baseDir = config.configPath ? path.dirname(config.configPath) : cwd;
    config.tokens = await loadTokens(config.tokens, baseDir);
  }
  return config;
}
