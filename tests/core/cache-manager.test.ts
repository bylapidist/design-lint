import test from 'node:test';
import assert from 'node:assert/strict';
import { CacheManager } from '../../src/core/cache-manager.js';
import type { Cache, CacheEntry } from '../../src/core/cache.js';
import type { LintResult } from '../../src/core/types.js';

class FakeCache {
  store = new Map<string, CacheEntry>();
  saved = false;
  getKey(key: string): CacheEntry | undefined {
    return this.store.get(key);
  }
  setKey(key: string, value: CacheEntry): void {
    this.store.set(key, value);
  }
  removeKey(key: string): void {
    this.store.delete(key);
  }
  keys(): string[] {
    return Array.from(this.store.keys());
  }
  save(): void {
    this.saved = true;
  }
}

void test('manages cache entries', () => {
  const cache = new FakeCache();
  const manager = new CacheManager(cache as unknown as Cache, 'loc');
  manager.setCachedResult('a', { mtimeMs: 1, size: 1 }, {
    filePath: 'a',
    messages: [],
  } as LintResult);
  const res = manager.getCachedResult('a', { mtimeMs: 1, size: 1 }, false);
  assert.ok(res);
  manager.reconcile([]);
  assert.equal(cache.keys().length, 0);
  manager.save();
  assert.equal(cache.saved, true);
});
