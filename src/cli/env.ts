import fs from 'fs';
import path from 'path';
import ignore, { type Ignore } from 'ignore';
import { getFormatter } from '../formatters/index.js';
import { relFromCwd, realpathIfExists } from '../utils/paths.js';
import { loadCache, type Cache } from '../core/cache.js';
import type { Config, Linter } from '../core/linter.js';
import type { LintResult } from '../core/types.js';

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

export async function prepareEnvironment(
  options: Record<string, unknown>,
): Promise<Environment> {
  const [{ loadConfig }, { Linter }, { loadIgnore }] = await Promise.all([
    import('../config/loader.js'),
    import('../core/linter.js'),
    import('../core/ignore.js'),
  ]);

  const formatter = await getFormatter(options.format as string);
  let config = await loadConfig(
    process.cwd(),
    options.config as string | undefined,
  );
  if (options.concurrency !== undefined) {
    config.concurrency = options.concurrency as number;
  }
  if (config.configPath) {
    config.configPath = realpathIfExists(config.configPath);
  }
  const linterRef = { current: new Linter(config) };
  const pluginPaths = await linterRef.current.getPluginPaths();

  const cacheLocation = options.cache
    ? path.resolve(
        process.cwd(),
        (options.cacheLocation as string) ?? '.designlintcache',
      )
    : undefined;
  const cache = cacheLocation ? loadCache(cacheLocation) : undefined;

  let ignorePath: string | undefined;
  if (options.ignorePath) {
    const resolved = path.resolve(options.ignorePath as string);
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

  const state = { pluginPaths, ignoreFilePaths: [] as string[] };

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
