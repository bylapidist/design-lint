import fs from 'fs';
import path from 'path';
import ignore, { type Ignore } from 'ignore';
import { getFormatter } from '../formatters/index';
import type { CacheProvider } from '../core/cache-provider';
import type { Config } from '../core/linter';
import type { Linter } from '../index';
import type { LintResult } from '../core/types';
import { createNodeEnvironment } from '../adapters/node/environment';
import { relFromCwd, realpathIfExists } from '../adapters/node/utils/paths';

export interface Environment {
  formatter: (results: LintResult[], useColor?: boolean) => string;
  config: Config;
  linterRef: { current: Linter };
  pluginPaths: string[];
  cache?: CacheProvider;
  cacheLocation?: string;
  ignorePath?: string;
  designIgnore: string;
  gitIgnore: string;
  refreshIgnore: () => Promise<void>;
  state: { pluginPaths: string[]; ignoreFilePaths: string[] };
  getIg: () => Ignore;
  envOptions: {
    cacheLocation?: string;
    configPath?: string;
    patterns?: string[];
  };
}

export interface PrepareEnvironmentOptions {
  format: string;
  config?: string;
  concurrency?: number;
  cache?: boolean;
  cacheLocation?: string;
  ignorePath?: string;
  patterns?: string[];
}

export async function prepareEnvironment(
  options: PrepareEnvironmentOptions,
): Promise<Environment> {
  const [{ loadConfig }, { createLinter }, { loadIgnore }] = await Promise.all([
    import('../config/loader'),
    import('../index'),
    import('../core/ignore'),
  ]);

  const formatter = await getFormatter(options.format);
  let config = await loadConfig(process.cwd(), options.config);
  if (options.concurrency !== undefined) {
    config.concurrency = options.concurrency;
  }
  if (config.configPath) {
    config.configPath = realpathIfExists(config.configPath);
  }
  const cacheLocation = options.cache
    ? path.resolve(process.cwd(), options.cacheLocation ?? '.designlintcache')
    : undefined;
  const env = createNodeEnvironment(config, {
    cacheLocation,
    configPath: config.configPath,
    patterns: options.patterns,
  });
  const cache = env.cacheProvider;
  const linterRef = {
    current: createLinter(config, env),
  };
  const pluginPaths = await linterRef.current.getPluginPaths();

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
    envOptions: {
      cacheLocation,
      configPath: config.configPath,
      patterns: options.patterns,
    },
  };
}
