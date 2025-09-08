import flatCache from 'flat-cache';
import path from 'path';
import type { Cache } from '../engine/cache.js';

export function loadCache(cacheLocation: string): Cache {
  const cacheId = path.basename(cacheLocation);
  const cacheDir = path.dirname(cacheLocation);
  return flatCache.create({ cacheId, cacheDir }) as Cache;
}
