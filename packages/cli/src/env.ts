import ignore, { type Ignore } from 'ignore';
import { nodeEnv } from '@lapidist/design-lint-shared';
import {
  getFormatter,
  relFromCwd,
  realpathIfExists,
  loadCache,
  loadConfig,
  loadIgnore,
  Linter,
  type Cache,
  type Config,
  type LintResult,
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
  const formatter = await getFormatter(options.format, nodeEnv);
  let config = await loadConfig(process.cwd(), options.config, nodeEnv);
  if (options.concurrency !== undefined) {
    config.concurrency = options.concurrency;
  }
  if (config.configPath) {
    config.configPath = realpathIfExists(config.configPath, nodeEnv.fs);
  }
  const linterRef = { current: new Linter(config, undefined, nodeEnv) };
  const pluginPaths = await linterRef.current.getPluginPaths();

  const cacheLocation = options.cache
    ? nodeEnv.path.resolve(
        process.cwd(),
        options.cacheLocation ?? '.designlintcache',
      )
    : undefined;
  const cache = cacheLocation
    ? loadCache(cacheLocation, nodeEnv.path)
    : undefined;

  let ignorePath: string | undefined;
  if (options.ignorePath) {
    const resolved = nodeEnv.path.resolve(options.ignorePath);
    if (!nodeEnv.fs.existsSync(resolved)) {
      throw new Error(
        `Ignore file not found: "${relFromCwd(resolved, nodeEnv.path)}"`,
      );
    }
    ignorePath = realpathIfExists(resolved, nodeEnv.fs);
  }

  const gitIgnore = realpathIfExists(
    nodeEnv.path.join(process.cwd(), '.gitignore'),
    nodeEnv.fs,
  );
  const designIgnore = realpathIfExists(
    nodeEnv.path.join(process.cwd(), '.designlintignore'),
    nodeEnv.fs,
  );

  let ig = ignore();
  const refreshIgnore = async () => {
    const { ig: newIg } = await loadIgnore(
      config,
      ignorePath ? [ignorePath] : [],
      nodeEnv,
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
