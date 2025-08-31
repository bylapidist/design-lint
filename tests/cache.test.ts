import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CacheMap } from '../src/core/cache.ts';
import type { LintResult } from '../src/core/types.ts';

test('loadCache loads valid cache data', async (t) => {
  const cache: CacheMap = new Map();
  const entry: [string, { mtime: number; result: LintResult }] = [
    'foo',
    {
      mtime: 1,
      result: { filePath: 'foo', messages: [] },
    },
  ];
  t.mock.method(fs, 'readFile', async () => JSON.stringify([entry]));

  const { loadCache } = await import('../src/core/cache.ts');
  await loadCache(cache, '/cache.json');

  assert.deepEqual(cache.get('foo'), entry[1]);
});

test('loadCache handles corrupted JSON', async (t) => {
  const cache: CacheMap = new Map();
  t.mock.method(fs, 'readFile', async () => '{bad');
  const warn = t.mock.method(console, 'warn');

  const { loadCache } = await import('../src/core/cache.ts');
  await loadCache(cache, '/cache.json');

  assert.equal(cache.size, 0);
  assert.ok(
    warn.mock.calls[0]?.arguments[0].startsWith('Failed to parse cache'),
  );
});

test('loadCache handles missing cache file', async (t) => {
  const cache: CacheMap = new Map();
  t.mock.method(fs, 'readFile', async () => {
    throw Object.assign(new Error('not found'), { code: 'ENOENT' });
  });
  const warn = t.mock.method(console, 'warn');

  const { loadCache } = await import('../src/core/cache.ts');
  await loadCache(cache, '/cache.json');

  assert.equal(cache.size, 0);
  assert.ok(
    warn.mock.calls[0]?.arguments[0].startsWith('Failed to read cache'),
  );
});

test('saveCache writes valid JSON', async () => {
  const cache: CacheMap = new Map([
    [
      'foo',
      {
        mtime: 1,
        result: { filePath: 'foo', messages: [] },
      },
    ],
  ]);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  const file = path.join(dir, 'cache.json');

  const { saveCache } = await import('../src/core/cache.ts');
  await saveCache(cache, file);

  const json = await fs.readFile(file, 'utf8');
  assert.deepEqual(JSON.parse(json), [...cache.entries()]);
});

test('saveCache ignores serialization errors', async () => {
  const result: LintResult & { self?: unknown } = {
    filePath: 'foo',
    messages: [],
  };
  result.self = result;
  const cache: CacheMap = new Map([['foo', { mtime: 1, result }]]);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  const file = path.join(dir, 'cache.json');

  const { saveCache } = await import('../src/core/cache.ts');
  await saveCache(cache, file);

  const exists = await fs
    .access(file)
    .then(() => true)
    .catch(() => false);
  assert.equal(exists, false);
});

test('saveCache ignores write errors', async (t) => {
  const cache: CacheMap = new Map([
    [
      'foo',
      {
        mtime: 1,
        result: { filePath: 'foo', messages: [] },
      },
    ],
  ]);

  const write = t.mock.fn(async () => {
    throw new Error('disk full');
  });
  t.mock.module('write-file-atomic', { default: write });

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  const file = path.join(dir, 'cache.json');

  const { saveCache } = await import('../src/core/cache.ts');
  await saveCache(cache, file);

  assert.equal(write.mock.callCount(), 1);
  const exists = await fs
    .access(file)
    .then(() => true)
    .catch(() => false);
  assert.equal(exists, false);
});

test('saveCache preserves existing cache on interrupted write', async (t) => {
  const initial: CacheMap = new Map([
    [
      'foo',
      {
        mtime: 1,
        result: { filePath: 'foo', messages: [] },
      },
    ],
  ]);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  const file = path.join(dir, 'cache.json');
  await fs.writeFile(file, JSON.stringify([...initial.entries()]), 'utf8');

  const cache: CacheMap = new Map([
    [
      'bar',
      {
        mtime: 2,
        result: { filePath: 'bar', messages: [] },
      },
    ],
  ]);

  t.mock.method(fs, 'rename', async () => {
    throw new Error('interrupted');
  });

  const { saveCache, loadCache } = await import('../src/core/cache.ts');
  await saveCache(cache, file);

  const data = await fs.readFile(file, 'utf8');
  assert.deepEqual(JSON.parse(data), [...initial.entries()]);

  const loaded: CacheMap = new Map();
  await loadCache(loaded, file);
  assert.deepEqual(loaded, initial);
});
