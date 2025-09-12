/**
 * @packageDocumentation
 *
 * Utilities for locating configuration files on disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import { CONFIG_SEARCH_PLACES } from './constants.js';

/**
 * Resolve a configuration file on disk.
 *
 * Searches upward from a starting directory using `cosmiconfig` and supports
 * an explicit path override.
 *
 * @param cwd - Current working directory to begin searching from.
 * @param configPath - Optional explicit path to a config file.
 * @returns The loaded configuration and file path, or `null` if not found.
 * @throws {Error} When an explicit `configPath` does not exist.
 *
 * @example
 * ```ts
 * const result = await resolveConfigFile(process.cwd());
 * console.log(result?.filepath);
 * ```
 */
export async function resolveConfigFile(
  cwd: string,
  configPath?: string,
): Promise<{ config: unknown; filepath: string } | null> {
  const explorer = cosmiconfig('designlint', {
    searchPlaces: [...CONFIG_SEARCH_PLACES],
    loaders: {
      '.ts': TypeScriptLoader(),
      '.mts': TypeScriptLoader(),
    },
    searchStrategy: 'global',
  });

  if (configPath) {
    const abs = path.resolve(cwd, configPath);
    try {
      await fs.promises.access(abs);
    } catch {
      throw new Error(
        `Config file not found at ${abs}. Run \`npx design-lint init\` to create a config.`,
      );
    }
    return explorer.load(abs);
  }

  return explorer.search(cwd);
}
