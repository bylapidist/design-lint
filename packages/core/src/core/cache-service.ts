import type { Cache } from './cache.js';
import { CacheManager } from './cache-manager.js';

export const CacheService = {
  prune(cache: Cache | undefined, files: string[]): void {
    if (!cache) return;
    for (const key of cache.keys()) {
      if (!files.includes(key)) cache.removeKey(key);
    }
  },

  createManager(cache: Cache | undefined, fix: boolean): CacheManager {
    return new CacheManager(cache, fix);
  },

  save(manager: CacheManager, cacheLocation?: string): void {
    manager.save(cacheLocation);
  },
} as const;
