/**
 * @packageDocumentation
 *
 * Watch mode for continuous linting.
 */

import fs from 'fs';
import path from 'path';
import { once } from 'node:events';
import { createRequire } from 'module';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { relFromCwd, realpathIfExists } from '../adapters/node/utils/paths.js';
import { loadConfig } from '../config/loader.js';
import { createLinter } from '../index.js';
import type { Config } from '../core/linter.js';
import type { Linter } from '../index.js';
import { createNodeEnvironment } from '../adapters/node/environment.js';
import type { CacheProvider } from '../core/cache-provider.js';
import type { Ignore } from 'ignore';
import {
  executeLint,
  type ExecuteServices,
  type ExecuteOptions,
} from './execute.js';
import { TOKEN_FILE_GLOB } from '../utils/tokens/index.js';
import { guards } from '../utils/index.js';

const {
  data: { isFunction, isObject, isPromiseLike },
} = guards;

export interface WatchState {
  pluginPaths: string[];
  ignoreFilePaths: string[];
}

export interface WatchCliOptions extends ExecuteOptions {
  config?: string;
}

export interface WatchOptions {
  targets: string[];
  options: WatchCliOptions;
  config: Config;
  linterRef: { current: Linter };
  refreshIgnore: () => Promise<void>;
  cache?: CacheProvider;
  cacheLocation?: string;
  state: WatchState;
  designIgnore: string;
  gitIgnore: string;
  runLint: (paths: string[]) => Promise<string[]>;
  reportError: (err: unknown) => void;
  getIg: () => Ignore;
  useColor: boolean;
}

export interface WatchServices extends ExecuteServices {
  config: Config;
  refreshIgnore: () => Promise<void>;
  designIgnore: string;
  gitIgnore: string;
  state: WatchState;
  getIg: () => Ignore;
  cache?: CacheProvider;
  cacheLocation?: string;
}

async function hasRunLevelRules(linter: Linter): Promise<boolean> {
  if (isObject(linter) && 'hasRunLevelRules' in linter) {
    const method = Reflect.get(linter, 'hasRunLevelRules');
    if (isFunction(method)) {
      const result = method.call(linter);
      if (typeof result === 'boolean') {
        return result;
      }
      if (isPromiseLike(result)) {
        const awaited = await result;
        return typeof awaited === 'boolean' ? awaited : false;
      }
    }
  }
  return false;
}

/**
 * Run the CLI in watch mode, re-linting files when watched sources change.
 *
 * @param targets - Initial lint targets.
 * @param options - CLI options controlling execution.
 * @param services - Shared services from {@link prepareEnvironment}.
 */
export async function watchMode(
  targets: string[],
  options: WatchCliOptions,
  services: WatchServices,
) {
  const reportError = (err: unknown) => {
    const output = err instanceof Error && err.stack ? err.stack : String(err);
    console.error(services.useColor ? chalk.red(output) : output);
    process.exitCode = 1;
  };
  const runLint = async (paths: string[]) => {
    const { ignoreFiles, exitCode } = await executeLint(
      paths,
      options,
      services,
    );
    process.exitCode = exitCode;
    return ignoreFiles;
  };
  await startWatch({
    targets,
    options,
    config: services.config,
    linterRef: services.linterRef,
    refreshIgnore: services.refreshIgnore,
    cache: services.cache,
    cacheLocation: services.cacheLocation,
    state: services.state,
    designIgnore: services.designIgnore,
    gitIgnore: services.gitIgnore,
    runLint,
    reportError,
    getIg: services.getIg,
    useColor: services.useColor,
  });
}

/**
 * Internal helper for file watching and lint regeneration.
 *
 * @param ctx - Aggregated watch context including config and callbacks.
 */
export interface WatchDependencies {
  loadConfig: typeof loadConfig;
  createNodeEnvironment: typeof createNodeEnvironment;
  createLinter: typeof createLinter;
}

const defaultWatchDependencies: WatchDependencies = {
  loadConfig,
  createNodeEnvironment,
  createLinter,
};

export async function startWatch(
  ctx: WatchOptions,
  deps: WatchDependencies = defaultWatchDependencies,
) {
  let {
    targets,
    options,
    config,
    linterRef,
    refreshIgnore,
    cache,
    cacheLocation,
    state,
    designIgnore,
    gitIgnore,
    runLint,
    reportError,
    getIg,
    useColor,
  } = ctx;
  let { pluginPaths, ignoreFilePaths } = state;

  console.log('Watching for changes...');
  await refreshIgnore();
  const watchPaths = [...targets, TOKEN_FILE_GLOB];
  if (config.configPath) watchPaths.push(config.configPath);
  if (fs.existsSync(designIgnore)) watchPaths.push(designIgnore);
  if (fs.existsSync(gitIgnore)) watchPaths.push(gitIgnore);
  watchPaths.push(
    ...pluginPaths.filter((p) => fs.existsSync(p)),
    ...ignoreFilePaths.filter((p) => fs.existsSync(p)),
  );
  const outputPath = options.output
    ? realpathIfExists(path.resolve(options.output))
    : undefined;
  const reportPath = options.report
    ? realpathIfExists(path.resolve(options.report))
    : undefined;
  const watcher = chokidar.watch(watchPaths, {
    ignored: (p: string) => {
      const rel = relFromCwd(realpathIfExists(p));
      const resolved = realpathIfExists(path.resolve(p));
      if (config.configPath && resolved === config.configPath) return false;
      if (resolved === designIgnore || resolved === gitIgnore) return false;
      if (pluginPaths.includes(resolved)) return false;
      if (ignoreFilePaths.includes(resolved)) return false;
      if (outputPath && resolved === outputPath) return true;
      if (reportPath && resolved === reportPath) return true;
      if (rel === '') return false;
      return getIg().ignores(rel);
    },
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    usePolling: process.platform === 'win32',
    interval: 100,
  });
  watcher.on('error', (err) => {
    reportError(err);
  });
  await once(watcher, 'ready');

  const cleanup = async () => {
    await watcher.close();
    process.exit(process.exitCode ?? 0);
  };
  process.once('SIGINT', () => {
    void cleanup();
  });
  process.once('SIGTERM', () => {
    void cleanup();
  });

  const runAndUpdate = async (paths: string[]) => {
    const prev = ignoreFilePaths;
    const lintPaths = (await hasRunLevelRules(linterRef.current))
      ? targets
      : paths;
    const newIgnore = await runLint(lintPaths);
    const toAdd = newIgnore.filter((p) => !prev.includes(p));
    if (toAdd.length) watcher.add(toAdd);
    const toRemove = prev.filter((p) => !newIgnore.includes(p));
    if (toRemove.length) watcher.unwatch(toRemove);
    ignoreFilePaths = newIgnore;
    state.ignoreFilePaths = newIgnore;
  };

  const reload = async () => {
    try {
      const req = config.configPath
        ? createRequire(config.configPath)
        : createRequire(import.meta.url);
      for (const p of pluginPaths) Reflect.deleteProperty(req.cache, p);
      config = await deps.loadConfig(process.cwd(), options.config);
      if (cache) {
        const keys = await cache.keys();
        for (const k of keys) await cache.remove(k);
      }
      if (cacheLocation) {
        try {
          fs.unlinkSync(cacheLocation);
        } catch {}
      }
      const env = deps.createNodeEnvironment(config, {
        cacheLocation,
        configPath: config.configPath,
        patterns: config.patterns,
      });
      cache = env.cacheProvider;
      linterRef.current = deps.createLinter(config, env);
      await refreshIgnore();
      const newPluginPaths = await linterRef.current.getPluginPaths();
      const toRemove = pluginPaths.filter((p) => !newPluginPaths.includes(p));
      if (toRemove.length) watcher.unwatch(toRemove);
      const toAdd = newPluginPaths.filter((p) => !pluginPaths.includes(p));
      if (toAdd.length) watcher.add(toAdd);
      pluginPaths = newPluginPaths;
      state.pluginPaths = pluginPaths;
      await runAndUpdate(targets);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!options.quiet) {
        console.error(useColor ? chalk.red(message) : message);
      }
      process.exitCode = 1;
    }
  };

  const handle = async (sourceId: string) => {
    const resolved = realpathIfExists(path.resolve(sourceId));
    if (outputPath && resolved === outputPath) return;
    if (reportPath && resolved === reportPath) return;
    if (
      (config.configPath && resolved === config.configPath) ||
      resolved === designIgnore ||
      resolved === gitIgnore ||
      pluginPaths.includes(resolved) ||
      ignoreFilePaths.includes(resolved)
    ) {
      await reload();
    } else {
      await runAndUpdate([resolved]);
    }
  };

  const handleUnlink = async (sourceId: string) => {
    const resolved = realpathIfExists(path.resolve(sourceId));
    await cache?.remove(resolved);
    if (outputPath && resolved === outputPath) return;
    if (reportPath && resolved === reportPath) return;
    if (
      (config.configPath && resolved === config.configPath) ||
      resolved === designIgnore ||
      resolved === gitIgnore ||
      pluginPaths.includes(resolved) ||
      ignoreFilePaths.includes(resolved)
    ) {
      await reload();
    } else {
      await runAndUpdate(targets);
    }
  };

  watcher.on('add', (p) => {
    void handle(p).catch(reportError);
  });
  watcher.on('change', (p) => {
    void handle(p).catch(reportError);
  });
  watcher.on('unlink', (p) => {
    void handleUnlink(p).catch(reportError);
  });
}
