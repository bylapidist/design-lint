import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { loadCache, saveCache, type CacheMap } from '../src/core/cache.ts';
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

  await loadCache(cache, '/cache.json');

  assert.deepEqual(cache.get('foo'), entry[1]);
});

test('loadCache handles corrupted JSON', async (t) => {
  const cache: CacheMap = new Map();
  t.mock.method(fs, 'readFile', async () => '{bad');
  const warn = t.mock.method(console, 'warn');

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

  await loadCache(cache, '/cache.json');

  assert.equal(cache.size, 0);
  assert.ok(
    warn.mock.calls[0]?.arguments[0].startsWith('Failed to read cache'),
  );
});

test('saveCache writes valid JSON', async (t) => {
  const cache: CacheMap = new Map([
    [
      'foo',
      {
        mtime: 1,
        result: { filePath: 'foo', messages: [] },
      },
    ],
  ]);

  t.mock.method(fs, 'mkdir', async () => {});
  const write = t.mock.method(fs, 'writeFile', async () => {});

  await saveCache(cache, '/cache.json');

  assert.equal(write.mock.callCount(), 1);
  const json = write.mock.calls[0].arguments[1] as string;
  assert.deepEqual(JSON.parse(json), [...cache.entries()]);
});

test('saveCache ignores serialization errors', async (t) => {
  const result: LintResult & { self?: unknown } = {
    filePath: 'foo',
    messages: [],
  };
  result.self = result;
  const cache: CacheMap = new Map([['foo', { mtime: 1, result }]]);

  t.mock.method(fs, 'mkdir', async () => {});
  const write = t.mock.method(fs, 'writeFile', async () => {});

  await saveCache(cache, '/cache.json');

  assert.equal(write.mock.callCount(), 0);
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

  t.mock.method(fs, 'mkdir', async () => {});
  t.mock.method(fs, 'writeFile', async () => {
    throw new Error('disk full');
  });

  await saveCache(cache, '/cache.json');
});
