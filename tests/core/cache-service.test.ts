import test from 'node:test';
import assert from 'node:assert/strict';
import { CacheService } from '../../src/node-adapter/cache-service.ts';
import { CacheManager } from '../../src/node-adapter/cache-manager.ts';

void test('CacheService.prune removes cache entries not in file list', () => {
  const removed: string[] = [];
  const cache: { keys: () => string[]; removeKey: (k: string) => void } = {
    keys: () => ['a.ts', 'b.ts'],
    removeKey: (k: string) => removed.push(k),
  };
  CacheService.prune(cache, ['a.ts']);
  assert.deepEqual(removed, ['b.ts']);
});

void test('CacheService.save delegates to CacheManager.save', () => {
  class TestManager extends CacheManager {
    saved = false;
    constructor() {
      super(undefined, false);
    }
    override save(loc?: string): void {
      if (loc === 'cache') this.saved = true;
    }
  }
  const manager = new TestManager();
  CacheService.save(manager, 'cache');
  assert.ok(manager.saved);
});
