import type { Cache, CacheEntry } from './cache.js';
import type { LintResult } from './types.js';

interface FileStat {
  mtimeMs: number;
  size: number;
}

export class CacheManager {
  constructor(
    private cache: Cache | undefined,
    private location?: string,
  ) {}

  reconcile(files: string[]): void {
    if (!this.cache) return;
    for (const key of this.cache.keys()) {
      if (!files.includes(key)) this.cache.removeKey(key);
    }
  }

  getCachedResult(
    filePath: string,
    stat: FileStat,
    fix: boolean,
  ): LintResult | undefined {
    if (!this.cache || fix) return undefined;
    const cached = this.cache.getKey<CacheEntry>(filePath);
    if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
      return cached.result;
    }
    return undefined;
  }

  setCachedResult(filePath: string, stat: FileStat, result: LintResult): void {
    this.cache?.setKey(filePath, {
      mtime: stat.mtimeMs,
      size: stat.size,
      result,
    });
  }

  remove(filePath: string): void {
    this.cache?.removeKey(filePath);
  }

  save(): void {
    if (this.location && this.cache) {
      this.cache.save(true);
    }
  }
}
