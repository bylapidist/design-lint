/**
 * @packageDocumentation
 *
 * High-level loader for resolving and validating configuration files.
 */
import path from 'node:path';
import type { Config } from '../core/linter.js';
import { configSchema } from './schema.js';
import { realpathIfExists } from '../adapters/node/utils/paths.js';
import { resolveConfigFile } from './file-resolution.js';
import { loadTokens } from './token-loader.js';
import { guards } from '../utils/index.js';
import { ConfigError } from '../core/errors.js';

function isIssueRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractCustomIssueMessage(issues: unknown[]): string | undefined {
  const queue = [...issues];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || current === null) continue;
    if (Array.isArray(current)) {
      for (const item of current) {
        queue.unshift(item);
      }
      continue;
    }
    if (!isIssueRecord(current)) continue;
    const code = current.code;
    const message = current.message;
    const errors = current.errors;
    if (
      typeof code === 'string' &&
      code === 'custom' &&
      typeof message === 'string'
    ) {
      return message;
    }
    if (Array.isArray(errors)) {
      for (const item of errors) {
        queue.unshift(item);
      }
    }
  }
  return undefined;
}

const {
  data: { isRecord },
} = guards;

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
  const result = await resolveConfigFile(cwd, configPath);

  const base: Config = {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    output: [],
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
    const detail = extractCustomIssueMessage(parsed.error.issues);
    const reason = detail ?? parsed.error.message;
    throw new ConfigError({
      message: `Invalid config${location}: ${reason}`,
      context: result?.filepath ? `Config file "${result.filepath}"` : 'Config',
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
