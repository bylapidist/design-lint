import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadCache, type LintResult } from '../src/index.ts';

void test('loadCache loads and saves entries via flat-cache', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  const file = path.join(dir, 'cache.json');

  let cache = loadCache(file);
  const result: LintResult = { filePath: 'foo', messages: [] };
  const entry = { mtime: 1, result };
  cache.setKey('foo', entry);
  cache.save(true);

  cache = loadCache(file);
  assert.deepEqual(cache.getKey('foo'), entry);
});

void test('cache uses provided file location', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  const file = path.join(dir, 'cache.json');

  const cache = loadCache(file);
  assert.equal(cache.cacheFilePath, path.resolve(file));
  cache.save(true);

  const exists = await fs
    .access(file)
    .then(() => true)
    .catch(() => false);
  assert.equal(exists, true);
});
