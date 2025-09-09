import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NodeCacheProvider } from '../src/adapters/node/node-cache-provider.ts';
import type { LintResult } from '../src/core/types.ts';

void test('NodeCacheProvider loads and saves entries via flat-cache', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  const file = path.join(dir, 'cache.json');

  let cache = new NodeCacheProvider(file);
  const result: LintResult = {
    sourceId: 'foo',
    filePath: 'foo',
    messages: [],
  };
  const entry = { mtime: 1, result };
  await cache.set('foo', entry);
  await cache.save();

  cache = new NodeCacheProvider(file);
  assert.deepEqual(await cache.get('foo'), entry);
});

void test('NodeCacheProvider uses provided file location', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  const file = path.join(dir, 'cache.json');

  const cache = new NodeCacheProvider(file);
  assert.equal(cache.cacheFilePath, path.resolve(file));
  await cache.save();

  const exists = await fs
    .access(file)
    .then(() => true)
    .catch(() => false);
  assert.equal(exists, true);
});
