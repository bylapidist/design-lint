import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';

import ignore from 'ignore';
import chokidar, {
  type FSWatcher,
  type ChokidarOptions,
  type MatchFunction,
} from 'chokidar';

import {
  startWatch,
  type WatchOptions,
  type WatchDependencies,
} from '../../src/cli/watch.ts';
import { TOKEN_FILE_GLOB } from '../../src/utils/tokens/index.js';
import type { Linter } from '../../src/core/linter.js';

interface WatcherEventMap {
  add: [string];
  change: [string];
  unlink: [string];
  error: [Error];
  ready: [];
}

type MinimalWatcher = Pick<
  FSWatcher,
  'add' | 'unwatch' | 'close' | 'on' | 'emit'
>;

class FakeWatcher
  extends EventEmitter<WatcherEventMap>
  implements MinimalWatcher
{
  public added: string[][] = [];
  public unwatched: string[][] = [];
  public closed = false;

  add(paths: string | readonly string[]): this {
    this.added.push(toArray(paths));
    return this;
  }

  unwatch(paths: string | readonly string[]): this {
    this.unwatched.push(toArray(paths));
    return this;
  }

  async close(): Promise<void> {
    this.closed = true;
    await Promise.resolve();
  }
}

async function flush() {
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function toArray(value: string | readonly string[]): string[] {
  return Array.isArray(value) ? [...(value as readonly string[])] : [value];
}

function last<T>(items: readonly T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined;
}

function createWatchHarness(t: TestContext) {
  const dir = fs.mkdtempSync(path.join(process.cwd(), 'watch-test-'));
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  const target = path.join(srcDir, 'file.ts');
  fs.writeFileSync(target, 'export const value = 1;\n');

  const pluginDir = path.join(dir, 'plugins');
  fs.mkdirSync(pluginDir, { recursive: true });
  const pluginPath = path.join(pluginDir, 'plugin-a.js');
  fs.writeFileSync(pluginPath, 'module.exports = {};\n');
  const pluginMjsPath = path.join(pluginDir, 'plugin-b.mjs');
  fs.writeFileSync(pluginMjsPath, 'export default {};\n');

  const ignoreFile = path.join(dir, '.designlintignore');
  fs.writeFileSync(ignoreFile, '# initial ignore\n');
  const additionalIgnore = path.join(dir, '.designlintignore.extra');
  fs.writeFileSync(additionalIgnore, '# secondary ignore\n');

  const designIgnore = path.join(dir, '.designignore');
  fs.writeFileSync(designIgnore, '# design ignore\n');
  const gitIgnore = path.join(dir, '.gitignore');
  fs.writeFileSync(gitIgnore, '# git ignore\n');

  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(configPath, '{"rules":{}}\n');
  const parentConfigPath = path.join(dir, 'designlint.shared.config.json');
  fs.writeFileSync(parentConfigPath, '{"rules":{}}\n');

  const outputPath = path.join(dir, 'lint.txt');
  fs.writeFileSync(outputPath, '');
  const reportPath = path.join(dir, 'report.json');
  fs.writeFileSync(reportPath, '{}');

  const cacheLocation = path.join(dir, 'cache.json');
  fs.writeFileSync(cacheLocation, '{}');

  const originalExitCode = process.exitCode;
  t.after(() => {
    process.exitCode = originalExitCode ?? 0;
  });

  const logMessages: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    logMessages.push(args.map((arg) => String(arg)).join(' '));
  };
  t.after(() => {
    console.log = originalLog;
  });

  const errorMessages: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errorMessages.push(args.map((arg) => String(arg)).join(' '));
  };
  t.after(() => {
    console.error = originalError;
  });

  const onceCalls: {
    event: string | symbol;
    handler: (...args: unknown[]) => void;
  }[] = [];
  const onceMock = test.mock.method(
    process,
    'once',
    (event: string | symbol, handler: (...args: unknown[]) => void) => {
      onceCalls.push({ event, handler });
      return process;
    },
  );
  t.after(() => {
    onceMock.mock.restore();
  });

  let watcher: FakeWatcher | undefined;
  const watchCalls: { paths: readonly string[]; options: ChokidarOptions }[] =
    [];
  const watchMock = test.mock.method<typeof chokidar, 'watch'>(
    chokidar,
    'watch',
    (paths: string | readonly string[], options?: ChokidarOptions) => {
      const arr = toArray(paths);
      const normalizedOptions: ChokidarOptions = options ?? {};
      watchCalls.push({ paths: arr, options: normalizedOptions });
      watcher = new FakeWatcher();
      return watcher;
    },
  );
  t.after(() => {
    watchMock.mock.restore();
  });

  const unlinkCalls: string[] = [];
  const originalUnlink = fs.unlinkSync;
  const unlinkMock = test.mock.method(fs, 'unlinkSync', (p: fs.PathLike) => {
    unlinkCalls.push(String(p));
    originalUnlink(p);
  });
  t.after(() => {
    unlinkMock.mock.restore();
  });

  const cacheRemovals: string[] = [];
  let cacheKeySweeps = 0;
  const cacheProvider = {
    keys: async () => {
      cacheKeySweeps++;
      await Promise.resolve();
      return ['cache-a', 'cache-b'];
    },
    remove: async (key: string) => {
      cacheRemovals.push(key);
      await Promise.resolve();
    },
  };

  const ig = ignore().add('**/ignored/**');
  const lintCalls: string[][] = [];
  let nextIgnoreFiles = [ignoreFile];
  let runLintImpl: (paths: string[]) => Promise<string[]> = async () => {
    await Promise.resolve();
    return nextIgnoreFiles;
  };

  const setNextIgnoreFiles = (files: string[]) => {
    nextIgnoreFiles = files;
  };
  const setRunLintImpl = (impl: (paths: string[]) => Promise<string[]>) => {
    runLintImpl = impl;
  };
  const runLint = async (paths: string[]) => {
    lintCalls.push(paths);
    return runLintImpl(paths);
  };

  const reportErrors: unknown[] = [];
  const reportError = (err: unknown) => {
    reportErrors.push(err);
  };

  const refreshCalls: number[] = [];
  const refreshIgnore = () => {
    refreshCalls.push(Date.now());
    return Promise.resolve();
  };

  const state = { pluginPaths: [pluginPath], ignoreFilePaths: [ignoreFile] };
  const config = {
    configPath,
    configSources: [parentConfigPath, configPath],
    plugins: [pluginPath],
    patterns: ['src/**/*.ts'],
  };
  const targets = [target];
  const linterRef = {
    current: {
      getPluginPaths: () => Promise.resolve(state.pluginPaths),
    } as unknown as Linter,
  };

  const options: WatchOptions = {
    targets,
    options: { output: outputPath, report: reportPath, config: configPath },
    config,
    linterRef,
    refreshIgnore,
    cache: cacheProvider,
    cacheLocation,
    state,
    designIgnore,
    gitIgnore,
    runLint,
    reportError,
    getIg: () => ig,
    useColor: true,
  };

  const exitCodes: number[] = [];
  const exitMock = test.mock.method(process, 'exit', (code?: number) => {
    exitCodes.push(code ?? 0);
    return undefined as never;
  });
  t.after(() => {
    exitMock.mock.restore();
  });

  const start = async (deps?: Partial<WatchDependencies>) => {
    const resolvedDeps: WatchDependencies = {
      loadConfig: deps?.loadConfig ?? (() => Promise.resolve(config)),
      createNodeEnvironment:
        deps?.createNodeEnvironment ?? (() => ({ cacheProvider }) as unknown),
      createLinter: deps?.createLinter ?? (() => linterRef.current),
    };
    const startPromise = startWatch(options, resolvedDeps);
    await flush();
    getWatcher().emit('ready');
    await startPromise;
  };

  const getWatcher = () => {
    if (!watcher) {
      throw new Error('watcher not initialized');
    }
    return watcher;
  };

  return {
    dir,
    target,
    targets,
    pluginPath,
    pluginMjsPath,
    ignoreFile,
    additionalIgnore,
    designIgnore,
    gitIgnore,
    configPath,
    parentConfigPath,
    outputPath,
    reportPath,
    cacheLocation,
    logMessages,
    errorMessages,
    onceCalls,
    watchCalls,
    lintCalls,
    reportErrors,
    cacheRemovals,
    cacheKeySweeps,
    unlinkCalls,
    refreshCalls,
    state,
    config,
    linterRef,
    setNextIgnoreFiles,
    setRunLintImpl,
    start,
    getWatcher,
    exitMock,
    exitCodes,
  };
}

void test('startWatch wires chokidar watchers and handles lint cycles', async (t) => {
  const harness = createWatchHarness(t);
  await harness.start();
  const watcher = harness.getWatcher();

  assert.ok(
    harness.logMessages.some((msg) => msg.includes('Watching for changes')),
  );
  assert.equal(harness.refreshCalls.length, 1);
  const watchCall = harness.watchCalls[0];
  assert.ok(watchCall);
  const watchedPaths = watchCall.paths;
  const ignored = watchCall.options.ignored;
  assert.ok(typeof ignored === 'function');
  if (typeof ignored !== 'function') {
    throw new Error('ignored option is not a function');
  }
  const ignoredPredicate: MatchFunction = ignored;

  assert.ok(watchedPaths.includes(harness.target));
  assert.ok(watchedPaths.includes(TOKEN_FILE_GLOB));
  assert.ok(watchedPaths.includes(harness.configPath));
  assert.ok(watchedPaths.includes(harness.parentConfigPath));
  assert.ok(watchedPaths.includes(harness.designIgnore));
  assert.ok(watchedPaths.includes(harness.gitIgnore));
  assert.ok(watchedPaths.includes(harness.pluginPath));
  assert.ok(watchedPaths.includes(harness.ignoreFile));

  const ignoredFn = (p: string) => ignoredPredicate(p);
  assert.equal(ignoredFn(harness.configPath), false);
  assert.equal(ignoredFn(harness.parentConfigPath), false);
  assert.equal(ignoredFn(harness.designIgnore), false);
  assert.equal(ignoredFn(harness.pluginPath), false);
  assert.equal(ignoredFn(harness.ignoreFile), false);
  assert.equal(ignoredFn(harness.outputPath), true);
  assert.equal(ignoredFn(harness.reportPath), true);

  const ignoredPath = path.join(harness.dir, 'ignored', 'file.ts');
  fs.mkdirSync(path.dirname(ignoredPath), { recursive: true });
  fs.writeFileSync(ignoredPath, '');
  assert.equal(ignoredFn(ignoredPath), true);

  harness.setNextIgnoreFiles([harness.ignoreFile, harness.additionalIgnore]);
  watcher.emit('change', harness.target);
  await flush();
  assert.deepEqual(
    harness.state.ignoreFilePaths.sort(),
    [harness.ignoreFile, harness.additionalIgnore].sort(),
  );
  assert.deepEqual(last(watcher.added), [harness.additionalIgnore]);

  harness.setNextIgnoreFiles([harness.ignoreFile]);
  watcher.emit('change', harness.target);
  await flush();
  assert.deepEqual(last(watcher.unwatched), [harness.additionalIgnore]);
  assert.deepEqual(harness.state.ignoreFilePaths, [harness.ignoreFile]);

  const lintCount = harness.lintCalls.length;
  watcher.emit('change', harness.outputPath);
  watcher.emit('change', harness.reportPath);
  await flush();
  assert.equal(harness.lintCalls.length, lintCount);

  watcher.emit('unlink', harness.target);
  await flush();
  assert.ok(harness.cacheRemovals.some((key) => key.includes('file.ts')));
  assert.deepEqual(last(harness.lintCalls), [harness.target]);

  watcher.emit('error', new Error('watched error'));
  await flush();
  assert.equal(harness.reportErrors.length, 1);

  const sigint = harness.onceCalls.find((call) => call.event === 'SIGINT');
  const sigterm = harness.onceCalls.find((call) => call.event === 'SIGTERM');
  if (!sigint) {
    throw new Error('SIGINT handler missing');
  }
  if (!sigterm) {
    throw new Error('SIGTERM handler missing');
  }
  const { handler } = sigint;
  if (typeof handler !== 'function') {
    throw new Error('SIGINT handler not callable');
  }
  const invokeSigint: (...args: unknown[]) => void = handler;
  invokeSigint();
  await flush();
  assert.ok(harness.exitCodes.length > 0);
  const lastExitCode = harness.exitCodes[harness.exitCodes.length - 1];
  assert.equal(lastExitCode, 0);
  assert.equal(harness.getWatcher().closed, true);
});

void test('startWatch runs full targets when run-level rules are enabled', async (t) => {
  const harness = createWatchHarness(t);
  const sibling = path.join(path.dirname(harness.target), 'sibling.ts');
  fs.writeFileSync(sibling, 'export const sibling = true;\n');
  harness.targets.push(sibling);
  harness.linterRef.current = {
    ...(harness.linterRef.current as unknown as object),
    hasRunLevelRules: () => Promise.resolve(true),
  } as Linter;
  await harness.start();

  const watcher = harness.getWatcher();
  watcher.emit('change', harness.target);
  await flush();
  assert.deepEqual(last(harness.lintCalls), harness.targets);
});

void test('startWatch reloads configuration and plugin registries on change', async (t) => {
  const harness = createWatchHarness(t);
  const loadCalls: string[] = [];
  const pluginQueues: string[][] = [
    harness.state.pluginPaths,
    [...harness.state.pluginPaths, harness.pluginMjsPath],
    [harness.pluginMjsPath],
  ];
  await harness.start({
    loadConfig: () => {
      loadCalls.push('config');
      return Promise.resolve(harness.config);
    },
    createLinter: () =>
      ({
        getPluginPaths: () =>
          Promise.resolve(pluginQueues.shift() ?? harness.state.pluginPaths),
      }) as unknown as Linter,
  });

  const watcher = harness.getWatcher();
  harness.setNextIgnoreFiles([harness.ignoreFile, harness.additionalIgnore]);
  watcher.emit('change', harness.configPath);
  await flush();
  assert.ok(loadCalls.length >= 1);
  assert.deepEqual(last(harness.lintCalls), harness.targets);

  watcher.emit('change', harness.parentConfigPath);
  await flush();
  assert.ok(loadCalls.length >= 2);
  assert.deepEqual(last(harness.lintCalls), harness.targets);

  watcher.emit('change', harness.pluginPath);
  await flush();
  assert.ok(loadCalls.length >= 3);
  assert.ok(harness.state.pluginPaths.includes(harness.pluginMjsPath));
  assert.deepEqual(last(watcher.added), [harness.pluginMjsPath]);

  watcher.emit('unlink', harness.pluginPath);
  await flush();
  assert.ok(loadCalls.length >= 3);
  assert.ok(harness.cacheRemovals.some((key) => key.includes('plugin-a.js')));
  assert.deepEqual(last(watcher.unwatched), [harness.pluginPath]);
});

void test('startWatch reloads when ignore files change', async (t) => {
  const harness = createWatchHarness(t);
  const reloads: string[] = [];
  await harness.start({
    loadConfig: () => {
      reloads.push('reload');
      return Promise.resolve(harness.config);
    },
  });
  const watcher = harness.getWatcher();

  harness.setNextIgnoreFiles([harness.ignoreFile, harness.additionalIgnore]);
  watcher.emit('change', harness.target);
  await flush();
  watcher.emit('change', harness.additionalIgnore);
  await flush();
  watcher.emit('change', harness.designIgnore);
  await flush();
  watcher.emit('change', harness.gitIgnore);
  await flush();
  watcher.emit('unlink', harness.ignoreFile);
  await flush();
  assert.equal(reloads.length, 4);
});

void test('startWatch surfaces lint and reload errors without exiting', async (t) => {
  const harness = createWatchHarness(t);
  let shouldFailReload = true;
  harness.setRunLintImpl(async () => {
    await Promise.resolve();
    throw new Error('lint boom');
  });
  await harness.start({
    loadConfig: () => {
      if (shouldFailReload) {
        shouldFailReload = false;
        return Promise.reject(new Error('reload boom'));
      }
      return Promise.resolve(harness.config);
    },
  });
  const watcher = harness.getWatcher();

  watcher.emit('change', harness.target);
  await flush();
  assert.equal(harness.reportErrors.length, 1);

  watcher.emit('change', harness.pluginPath);
  await flush();
  assert.ok(harness.errorMessages.some((msg) => msg.includes('reload boom')));

  harness.setRunLintImpl(async () => {
    await Promise.resolve();
    harness.setNextIgnoreFiles([harness.ignoreFile]);
    return [harness.ignoreFile];
  });
  watcher.emit('change', harness.target);
  await flush();
  assert.ok(harness.lintCalls.length >= 2);
});
