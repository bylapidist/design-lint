import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Runner } from '../../src/index.ts';
import { TokenTracker } from '../../src/core/token-tracker.ts';
import { createFileDocument } from '../../src/node/file-document.ts';

interface CacheEntry {
  mtime: number;
  size: number;
  result: unknown;
}
class MemoryCache {
  store = new Map<string, CacheEntry>();
  saved = false;
  keys() {
    return [...this.store.keys()];
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  getKey<T>(k: string) {
    return this.store.get(k) as T | undefined;
  }
  setKey(k: string, v: CacheEntry) {
    this.store.set(k, v);
  }
  removeKey(k: string) {
    this.store.delete(k);
  }
  save() {
    this.saved = true;
  }
}

void test('Runner handles non-positive concurrency values', async () => {
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-'));
  const file = path.join(dir, 'test.css');
  await fs.writeFile(file, 'a{color:red}');
  const runner = new Runner({
    config: { concurrency: 0, tokens: {} },
    tokenTracker: new TokenTracker({}),
    lintDocument: (text, filePath) =>
      Promise.resolve({ filePath, messages: [] }),
  });
  const res = await runner.run([createFileDocument(file)]);
  assert.equal(res.results[0]?.filePath, file);
  await fs.rm(dir, { recursive: true, force: true });
});

void test('Runner prunes cache and saves results', async () => {
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-'));
  const file = path.join(dir, 'test.css');
  await fs.writeFile(file, 'a{color:red}');
  const cache = new MemoryCache();
  cache.setKey('ghost.css', { mtime: 0, size: 0, result: {} });
  const runner = new Runner({
    config: { tokens: {} },
    tokenTracker: new TokenTracker({}),
    lintDocument: (text, filePath) =>
      Promise.resolve({ filePath, messages: [] }),
  });
  await runner.run([createFileDocument(file)], false, cache, 'cache');
  assert.deepEqual(cache.keys(), [file]);
  assert.ok(cache.saved);
  await fs.rm(dir, { recursive: true, force: true });
});
