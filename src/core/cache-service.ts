import type { Cache } from './cache.js';
import { CacheManager } from './cache-manager.js';

export class CacheService {
  static prune(cache: Cache | undefined, files: string[]): void {
    if (!cache) return;
    for (const key of cache.keys()) {
      if (!files.includes(key)) cache.removeKey(key);
    }
  }

  static createManager(cache: Cache | undefined, fix: boolean): CacheManager {
    return new CacheManager(cache, fix);
  }

  static save(manager: CacheManager, cacheLocation?: string): void {
    manager.save(cacheLocation);
  }
}
