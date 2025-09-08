import fs from 'node:fs';
import path from 'node:path';
import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import type { Config } from '../engine/linter.js';
import { configSchema } from './schema.js';
import { realpathIfExists } from '../node-adapter/paths.js';

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
  const explorer = cosmiconfig('designlint', {
    searchPlaces: [
      'package.json',
      'designlint.config.ts',
      'designlint.config.mts',
      'designlint.config.js',
      'designlint.config.mjs',
      'designlint.config.cjs',
      'designlint.config.json',
      '.designlintrc',
      '.designlintrc.json',
      '.designlintrc.yaml',
      '.designlintrc.yml',
      '.designlintrc.js',
      '.designlintrc.cjs',
      '.designlintrc.mjs',
      '.designlintrc.ts',
      '.designlintrc.mts',
    ],
    loaders: {
      '.ts': TypeScriptLoader(),
      '.mts': TypeScriptLoader(),
    },
    searchStrategy: 'global',
  });

  let result: { config: unknown; filepath: string } | null;
  if (configPath) {
    const abs = path.resolve(cwd, configPath);
    try {
      await fs.promises.access(abs);
    } catch {
      throw new Error(
        `Config file not found at ${abs}. Run \`npx design-lint init\` to create a config.`,
      );
    }
    result = await explorer.load(abs);
  } else {
    result = await explorer.search(cwd);
  }

  const base: Config = {
    tokens: {},
    rules: {},
    ignoreFiles: [],
    plugins: [],
    configPath: result?.filepath
      ? realpathIfExists(result.filepath)
      : undefined,
  };
  const isObject = (val: unknown): val is Record<string, unknown> =>
    typeof val === 'object' && val !== null;
  const merged = {
    ...base,
    ...(isObject(result?.config) ? result.config : {}),
  };
  const parsed = configSchema.safeParse(merged);
  if (!parsed.success) {
    const location = result?.filepath ? ` at ${result.filepath}` : '';
    throw new Error(`Invalid config${location}: ${parsed.error.message}`);
  }
  return parsed.data;
}
