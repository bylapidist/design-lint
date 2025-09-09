import type { CacheProvider } from './cache-provider.js';
import { CacheManager } from './cache-manager.js';

export const CacheService = {
  async prune(
    cache: CacheProvider | undefined,
    files: string[],
  ): Promise<void> {
    if (!cache) return;
    const keys = await cache.keys();
    for (const key of keys) {
      if (!files.includes(key)) await cache.remove(key);
    }
  },

  createManager(cache: CacheProvider | undefined, fix: boolean): CacheManager {
    return new CacheManager(cache, fix);
  },

  async save(manager: CacheManager): Promise<void> {
    await manager.save();
  },
} as const;
