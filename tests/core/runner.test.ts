import test from 'node:test';
import assert from 'node:assert/strict';
import { Runner } from '../../src/index.js';
import type { LintDocument } from '../../src/core/environment.js';

interface CacheEntry {
  mtime: number;
  size: number;
  result: unknown;
}
class MemoryCache {
  store = new Map<string, CacheEntry>();
  saved = false;
  keys(): Promise<string[]> {
    return Promise.resolve([...this.store.keys()]);
  }
  get(k: string): Promise<CacheEntry | undefined> {
    return Promise.resolve(this.store.get(k));
  }
  set(k: string, v: CacheEntry): Promise<void> {
    this.store.set(k, v);
    return Promise.resolve();
  }
  remove(k: string): Promise<void> {
    this.store.delete(k);
    return Promise.resolve();
  }
  save(): Promise<void> {
    this.saved = true;
    return Promise.resolve();
  }
}

void test('Runner handles non-positive concurrency values', async () => {
  const doc: LintDocument = {
    id: 'test.css',
    type: 'css',
    getText: () => Promise.resolve('a{color:red}'),
  };
  const runner = new Runner({
    config: { concurrency: 0, tokens: {} },
    lintDocument: (text, sourceId) =>
      Promise.resolve({ sourceId, messages: [] }),
  });
  const res = await runner.run([doc]);
  assert.equal(res.results[0]?.sourceId, 'test.css');
});

void test('Runner prunes cache and saves results', async () => {
  const doc: LintDocument = {
    id: 'test.css',
    type: 'css',
    getText: () => Promise.resolve('a{color:red}'),
  };
  const cache = new MemoryCache();
  await cache.set('ghost.css', { mtime: 0, size: 0, result: {} });
  const runner = new Runner({
    config: { tokens: {} },
    lintDocument: (text, sourceId) =>
      Promise.resolve({ sourceId, messages: [] }),
  });
  await runner.run([doc], false, cache, 'cache');
  assert.deepEqual(await cache.keys(), ['test.css']);
  assert.ok(cache.saved);
});
