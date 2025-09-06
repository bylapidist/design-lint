import flatCache, { type FlatCache } from 'flat-cache';
import path from 'path';
import type { LintResult } from './types.js';

export type CacheEntry = { mtime: number; size?: number; result: LintResult };
export type Cache = FlatCache;

export function loadCache(cacheLocation: string): Cache {
  const cacheId = path.basename(cacheLocation);
  const cacheDir = path.dirname(cacheLocation);
  return flatCache.create({ cacheId, cacheDir });
}
