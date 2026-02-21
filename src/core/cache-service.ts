import type { CacheProvider } from './cache-provider.js';
import { CacheManager } from './cache-manager.js';

export const CacheService = {
  async prune(
    cache: CacheProvider | undefined,
    files: string[],
  ): Promise<void> {
    if (!cache) return;
    const fileSet = new Set(files);
    const keys = await cache.keys();
    for (const key of keys) {
      if (!fileSet.has(key)) await cache.remove(key);
    }
  },

  createManager(
    cache: CacheProvider | undefined,
    fix: boolean,
    projectRoot = process.cwd(),
  ): CacheManager {
    return new CacheManager(cache, fix, projectRoot);
  },

  async save(manager: CacheManager): Promise<void> {
    await manager.save();
  },
} as const;
