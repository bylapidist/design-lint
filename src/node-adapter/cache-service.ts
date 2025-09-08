import type {
  Cache,
  CacheService as CacheServiceType,
  CacheManager,
} from '../engine/cache.js';
import { CacheManager as Manager } from './cache-manager.js';

export const CacheService: CacheServiceType = {
  prune(cache: Cache | undefined, files: string[]): void {
    if (!cache) return;
    for (const key of cache.keys()) {
      if (!files.includes(key)) cache.removeKey(key);
    }
  },

  createManager(cache: Cache | undefined, fix: boolean): CacheManager {
    return new Manager(cache, fix);
  },

  save(manager: CacheManager, cacheLocation?: string): void {
    manager.save(cacheLocation);
  },
};
