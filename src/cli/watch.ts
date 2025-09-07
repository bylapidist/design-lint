import fs from 'fs';
import path from 'path';
import { once } from 'node:events';
import { createRequire } from 'module';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { relFromCwd, realpathIfExists } from '../utils/paths.js';
import { loadConfig } from '../config/loader.js';
import { Linter } from '../core/linter.js';
import type { Config } from '../core/linter.js';
import type { Cache } from '../core/cache.js';
import type { Ignore } from 'ignore';
import {
  executeLint,
  type ExecuteServices,
  type ExecuteOptions,
} from './execute.js';

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
  cache?: Cache;
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
}

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

export async function startWatch(ctx: WatchOptions) {
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
  const watchPaths = [...targets];
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
  watcher.on('error', (err) => reportError(err));
  await once(watcher, 'ready');

  const cleanup = async () => {
    await watcher.close();
    process.exit(process.exitCode ?? 0);
  };
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);

  const runAndUpdate = async (paths: string[]) => {
    const prev = ignoreFilePaths;
    const newIgnore = await runLint(paths);
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
      for (const p of pluginPaths) delete req.cache?.[p];
      config = await loadConfig(process.cwd(), options.config);
      linterRef.current = new Linter(config);
      await refreshIgnore();
      cache?.clear();
      if (cacheLocation) {
        try {
          fs.unlinkSync(cacheLocation);
        } catch {}
      }
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

  const handle = async (filePath: string) => {
    const resolved = realpathIfExists(path.resolve(filePath));
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

  const handleUnlink = async (filePath: string) => {
    const resolved = realpathIfExists(path.resolve(filePath));
    cache?.removeKey(resolved);
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

  watcher.on('add', (p) => handle(p).catch(reportError));
  watcher.on('change', (p) => handle(p).catch(reportError));
  watcher.on('unlink', (p) => handleUnlink(p).catch(reportError));
}
