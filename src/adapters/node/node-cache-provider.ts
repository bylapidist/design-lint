import flatCache, { type FlatCache } from 'flat-cache';
import path from 'path';
import type { CacheProvider, CacheEntry } from '../../core/cache-provider.js';

export class NodeCacheProvider implements CacheProvider {
  private cache: FlatCache;
  readonly cacheFilePath: string;

  constructor(cacheLocation: string) {
    const cacheId = path.basename(cacheLocation);
    const cacheDir = path.dirname(cacheLocation);
    this.cache = flatCache.create({ cacheId, cacheDir });
    this.cacheFilePath = this.cache.cacheFilePath;
  }

  get(key: string): Promise<CacheEntry | undefined> {
    return Promise.resolve(this.cache.getKey<CacheEntry>(key));
  }

  set(key: string, entry: CacheEntry): Promise<void> {
    this.cache.setKey(key, entry);
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    this.cache.removeKey(key);
    return Promise.resolve();
  }

  keys(): Promise<string[]> {
    return Promise.resolve(this.cache.keys());
  }

  save(): Promise<void> {
    this.cache.save(true);
    return Promise.resolve();
  }
}
