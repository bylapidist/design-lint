import fs from 'fs';
import path from 'path';
import ignore, { type Ignore } from 'ignore';
import { getFormatter } from '../formatters/index.js';
import type {
  Config,
  Linter,
  LintResult,
  Cache,
} from '@lapidist/design-lint-core';

export interface Environment {
  formatter: (results: LintResult[], useColor?: boolean) => string;
  config: Config;
  linterRef: { current: Linter };
  pluginPaths: string[];
  cache?: Cache;
  cacheLocation?: string;
  ignorePath?: string;
  designIgnore: string;
  gitIgnore: string;
  refreshIgnore: () => Promise<void>;
  state: { pluginPaths: string[]; ignoreFilePaths: string[] };
  getIg: () => Ignore;
}

export interface PrepareEnvironmentOptions {
  format: string;
  config?: string;
  concurrency?: number;
  cache?: boolean;
  cacheLocation?: string;
  ignorePath?: string;
}

export async function prepareEnvironment(
  options: PrepareEnvironmentOptions,
): Promise<Environment> {
  const [{ loadConfig }, core] = await Promise.all([
    import('../config/loader.js'),
    import('@lapidist/design-lint-core'),
  ]);
  const { Linter, loadIgnore, loadCache, relFromCwd, realpathIfExists } = core;

  const formatter = await getFormatter(options.format);
  let config = await loadConfig(process.cwd(), options.config);
  if (options.concurrency !== undefined) {
    config.concurrency = options.concurrency;
  }
  if (config.configPath) {
    config.configPath = realpathIfExists(config.configPath);
  }
  const linterRef = { current: new Linter(config) };
  const pluginPaths = await linterRef.current.getPluginPaths();

  const cacheLocation = options.cache
    ? path.resolve(process.cwd(), options.cacheLocation ?? '.designlintcache')
    : undefined;
  const cache = cacheLocation ? loadCache(cacheLocation) : undefined;

  let ignorePath: string | undefined;
  if (options.ignorePath) {
    const resolved = path.resolve(options.ignorePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Ignore file not found: "${relFromCwd(resolved)}"`);
    }
    ignorePath = realpathIfExists(resolved);
  }

  const gitIgnore = realpathIfExists(path.join(process.cwd(), '.gitignore'));
  const designIgnore = realpathIfExists(
    path.join(process.cwd(), '.designlintignore'),
  );

  let ig = ignore();
  const refreshIgnore = async () => {
    const { ig: newIg } = await loadIgnore(
      config,
      ignorePath ? [ignorePath] : [],
    );
    ig = newIg;
  };
  await refreshIgnore();

  const state: Environment['state'] = { pluginPaths, ignoreFilePaths: [] };

  return {
    formatter,
    config,
    linterRef,
    pluginPaths,
    cache,
    cacheLocation,
    ignorePath,
    designIgnore,
    gitIgnore,
    refreshIgnore,
    state,
    getIg: () => ig,
  };
}
