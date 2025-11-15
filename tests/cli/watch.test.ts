import test from 'node:test';
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

import { startWatch, type WatchOptions } from '../../src/cli/watch.ts';
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

  add(paths: string | readonly string[]): this {
    this.added.push(toArray(paths));
    return this;
  }

  unwatch(paths: string | readonly string[]): this {
    this.unwatched.push(toArray(paths));
    return this;
  }

  async close(): Promise<void> {
    // no-op
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

void test('startWatch reloads configuration and updates watchers', async (t) => {
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

  const outputPath = path.join(dir, 'lint.txt');
  fs.writeFileSync(outputPath, '');
  const reportPath = path.join(dir, 'report.json');
  fs.writeFileSync(reportPath, '{}');

  const cacheLocation = path.join(dir, 'cache.json');
  fs.writeFileSync(cacheLocation, '{}');

  const logMessages: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    logMessages.push(args.map((arg) => String(arg)).join(' '));
  };
  t.after(() => {
    console.log = originalLog;
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
  const getWatcher = () => {
    if (!watcher) {
      throw new Error('watcher not initialized');
    }
    return watcher;
  };
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
  const cacheProvider = {
    keys: () => Promise.resolve<string[]>([]),
    remove: (key: string) => {
      cacheRemovals.push(key);
      return Promise.resolve();
    },
  };

  const ig = ignore().add('**/ignored/**');
  const lintCalls: string[][] = [];
  let nextIgnoreFiles = [ignoreFile];
  const runLint = (paths: string[]) => {
    lintCalls.push(paths);
    return Promise.resolve(nextIgnoreFiles);
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
    plugins: [pluginPath],
    patterns: ['src/**/*.ts'],
  };
  const linterRef = {
    current: {
      getPluginPaths: () => Promise.resolve(state.pluginPaths),
    } as unknown as Linter,
  };

  const options: WatchOptions = {
    targets: [target],
    options: { output: outputPath, report: reportPath },
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

  const startPromise = startWatch(options);
  await flush();
  const createdWatcher = getWatcher();
  createdWatcher.emit('ready');
  await startPromise;

  assert.ok(logMessages.some((msg) => msg.includes('Watching for changes')));
  assert.equal(refreshCalls.length, 1);
  if (watchCalls.length === 0) {
    throw new Error('expected chokidar to be configured');
  }
  assert.equal(watchCalls.length, 1);
  const watchCall = watchCalls[0];
  const watchedPaths = watchCall.paths;
  const { ignored } = watchCall.options;
  if (typeof ignored !== 'function') {
    throw new Error('ignored predicate should be defined');
  }
  const ignoredPredicate: MatchFunction = ignored;

  assert.ok(watchedPaths.includes(target));
  assert.ok(watchedPaths.includes(TOKEN_FILE_GLOB));
  assert.ok(watchedPaths.includes(configPath));
  assert.ok(watchedPaths.includes(designIgnore));
  assert.ok(watchedPaths.includes(gitIgnore));
  assert.ok(watchedPaths.includes(pluginPath));
  assert.ok(watchedPaths.includes(ignoreFile));

  const ignoredFn = (p: string) => ignoredPredicate(p);
  assert.equal(ignoredFn(configPath), false);
  assert.equal(ignoredFn(designIgnore), false);
  assert.equal(ignoredFn(pluginPath), false);
  assert.equal(ignoredFn(ignoreFile), false);
  assert.equal(ignoredFn(outputPath), true);
  assert.equal(ignoredFn(reportPath), true);

  const ignoredPath = path.join(dir, 'ignored', 'file.ts');
  fs.mkdirSync(path.dirname(ignoredPath), { recursive: true });
  fs.writeFileSync(ignoredPath, '');
  assert.equal(ignoredFn(ignoredPath), true);

  nextIgnoreFiles = [ignoreFile, additionalIgnore];
  getWatcher().emit('change', target);
  await flush();
  assert.deepEqual(
    state.ignoreFilePaths.sort(),
    [ignoreFile, additionalIgnore].sort(),
  );
  const fakeWatcher = getWatcher();
  const lastAdded = last(fakeWatcher.added);
  assert.ok(lastAdded);
  assert.deepEqual(lastAdded, [additionalIgnore]);

  nextIgnoreFiles = [ignoreFile];
  getWatcher().emit('change', target);
  await flush();
  const lastUnwatched = last(fakeWatcher.unwatched);
  assert.ok(lastUnwatched);
  assert.deepEqual(lastUnwatched, [additionalIgnore]);
  assert.deepEqual(state.ignoreFilePaths, [ignoreFile]);

  const outputCallCount = lintCalls.length;
  getWatcher().emit('change', outputPath);
  getWatcher().emit('change', reportPath);
  await flush();
  assert.equal(lintCalls.length, outputCallCount);

  nextIgnoreFiles = [ignoreFile];
  getWatcher().emit('unlink', target);
  await flush();
  const lintAfterUnlink = last(lintCalls);
  assert.ok(lintAfterUnlink);
  assert.deepEqual(lintAfterUnlink, [target]);
  assert.ok(cacheRemovals.includes(path.resolve(target)));

  getWatcher().emit('error', new Error('watched error'));
  await flush();
  assert.equal(reportErrors.length, 1);

  assert.ok(
    onceCalls.some((call) => call.event === 'SIGINT') &&
      onceCalls.some((call) => call.event === 'SIGTERM'),
    'should register signal handlers',
  );
});
