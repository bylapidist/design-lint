import test from 'node:test';
import assert from 'node:assert/strict';
import { CacheService } from '../../src/core/cache-service.ts';
import type { CacheManager } from '../../src/core/cache-manager.ts';

test('CacheService.prune removes cache entries not in file list', () => {
  const removed: string[] = [];
  const cache: { keys: () => string[]; removeKey: (k: string) => void } = {
    keys: () => ['a.ts', 'b.ts'],
    removeKey: (k: string) => removed.push(k),
  };
  CacheService.prune(cache, ['a.ts']);
  assert.deepEqual(removed, ['b.ts']);
});

test('CacheService.save delegates to CacheManager.save', () => {
  let saved = false;
  const manager = {
    save: (loc?: string) => {
      if (loc === 'cache') saved = true;
    },
  } as unknown as CacheManager;
  CacheService.save(manager, 'cache');
  assert.ok(saved);
});
