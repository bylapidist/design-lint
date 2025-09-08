import type { Cache } from './cache.js';
import type { FileSystem } from '@lapidist/design-lint-shared';
import { CacheManager } from './cache-manager.js';
import { nodeEnv } from '@lapidist/design-lint-shared';

export const CacheService = {
  prune(cache: Cache | undefined, files: string[]): void {
    if (!cache) return;
    for (const key of cache.keys()) {
      if (!files.includes(key)) cache.removeKey(key);
    }
  },

  createManager(
    cache: Cache | undefined,
    fix: boolean,
    fs: FileSystem = nodeEnv.fs,
  ): CacheManager {
    return new CacheManager(cache, fix, fs);
  },

  save(manager: CacheManager, cacheLocation?: string): void {
    manager.save(cacheLocation);
  },
} as const;
