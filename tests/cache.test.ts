import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { loadCache, type CacheMap } from '../src/core/cache.ts';
import type { LintResult } from '../src/core/types.ts';
import { makeTmpDir } from '../src/utils/tmp.ts';

test('loadCache populates cache from valid file', async () => {
  const dir = makeTmpDir();
  const cacheFile = path.join(dir, 'cache.json');
  const entry: [string, { mtime: number; result: LintResult }] = [
    'foo',
    {
      mtime: 1,
      result: { filePath: 'foo', messages: [] },
    },
  ];
  fs.writeFileSync(cacheFile, JSON.stringify([entry]), 'utf8');
  const cache: CacheMap = new Map();
  await loadCache(cache, cacheFile);
  assert.deepEqual(cache.get('foo'), entry[1]);
});

test('loadCache warns on malformed cache', async () => {
  const dir = makeTmpDir();
  const cacheFile = path.join(dir, 'cache.json');
  const badData = [['foo', { result: { filePath: 'foo', messages: [] } }]];
  fs.writeFileSync(cacheFile, JSON.stringify(badData), 'utf8');
  const cache: CacheMap = new Map();
  const originalWarn = console.warn;
  let out = '';
  console.warn = (msg?: unknown) => {
    out += String(msg);
  };
  await loadCache(cache, cacheFile);
  console.warn = originalWarn;
  assert.equal(cache.size, 0);
  assert.match(out, /Invalid cache format/);
});

test('loadCache warns when cache cannot be read', async () => {
  const cacheFile = path.join(makeTmpDir(), 'missing.json');
  const cache: CacheMap = new Map();
  const originalWarn = console.warn;
  let out = '';
  console.warn = (msg?: unknown) => {
    out += String(msg);
  };
  await loadCache(cache, cacheFile);
  console.warn = originalWarn;
  assert.equal(cache.size, 0);
  assert.match(out, /Failed to read cache/);
});
