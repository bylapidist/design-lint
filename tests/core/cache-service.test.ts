import test from 'node:test';
import assert from 'node:assert/strict';
import { CacheService } from '../../src/core/cache-service.ts';
import { CacheManager } from '../../src/core/cache-manager.ts';

void test('CacheService.prune removes cache entries not in file list', async () => {
  const removed: string[] = [];
  const cache: {
    keys: () => Promise<string[]>;
    remove: (k: string) => Promise<void>;
  } = {
    keys: () => Promise.resolve(['a.ts', 'b.ts']),
    remove: (k: string) => {
      removed.push(k);
      return Promise.resolve();
    },
  };
  await CacheService.prune(cache, ['a.ts']);
  assert.deepEqual(removed, ['b.ts']);
});

void test('CacheService.save delegates to CacheManager.save', async () => {
  class TestManager extends CacheManager {
    saved = false;
    constructor() {
      super(undefined, false);
    }
    override save(): Promise<void> {
      this.saved = true;
      return Promise.resolve();
    }
  }
  const manager = new TestManager();
  await CacheService.save(manager);
  assert.ok(manager.saved);
});
