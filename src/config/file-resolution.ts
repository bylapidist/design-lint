/**
 * @packageDocumentation
 *
 * Utilities for locating configuration files on disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import { guards } from '../utils/index.js';
import { CONFIG_SEARCH_PLACES } from './constants.js';

const {
  data: { isRecord },
} = guards;

export interface ResolvedConfigFile {
  config: unknown;
  filepath: string;
}

const createExplorer = () =>
  cosmiconfig('designlint', {
    searchPlaces: [...CONFIG_SEARCH_PLACES],
    loaders: {
      '.ts': TypeScriptLoader(),
      '.mts': TypeScriptLoader(),
    },
    searchStrategy: 'global',
  });

const toResolvedConfigFile = (value: unknown): ResolvedConfigFile | null => {
  if (!isRecord(value)) {
    return null;
  }
  const filepath = value.filepath;
  if (typeof filepath !== 'string') {
    return null;
  }
  return {
    config: value.config,
    filepath,
  };
};

const resolveSearchDirectories = (cwd: string): string[] => {
  const dirs: string[] = [];
  let current = path.resolve(cwd);
  for (;;) {
    dirs.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      return dirs;
    }
    current = parent;
  }
};

/**
 * Resolve all configuration files on disk from filesystem root to `cwd`.
 *
 * When no explicit `configPath` is provided, this walks from the current
 * working directory toward the filesystem root and captures at most one config
 * per directory according to {@link CONFIG_SEARCH_PLACES} precedence.
 *
 * @param cwd - Current working directory to begin searching from.
 * @param configPath - Optional explicit path to a config file.
 * @returns Config results ordered from root-most to leaf-most.
 */
export async function resolveConfigFiles(
  cwd: string,
  configPath?: string,
): Promise<ResolvedConfigFile[]> {
  const explorer = createExplorer();

  if (configPath) {
    const abs = path.resolve(cwd, configPath);
    try {
      await fs.promises.access(abs);
    } catch {
      throw new Error(
        `Config file not found at ${abs}. Run \`npx design-lint init\` to create a config.`,
      );
    }
    const loaded = toResolvedConfigFile(await explorer.load(abs));
    return loaded ? [loaded] : [];
  }

  const matches: ResolvedConfigFile[] = [];
  const directories = resolveSearchDirectories(cwd);

  for (const directory of directories) {
    for (const searchPlace of CONFIG_SEARCH_PLACES) {
      const candidate = path.join(directory, searchPlace);
      try {
        await fs.promises.access(candidate);
      } catch {
        continue;
      }
      const loaded = toResolvedConfigFile(await explorer.load(candidate));
      if (loaded) {
        matches.push(loaded);
        break;
      }
    }
  }

  return matches.reverse();
}

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
  const results = await resolveConfigFiles(cwd, configPath);
  if (results.length === 0) {
    return null;
  }
  return results[results.length - 1] ?? null;
}
