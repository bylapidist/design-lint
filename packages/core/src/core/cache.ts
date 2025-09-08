import flatCache, { type FlatCache } from 'flat-cache';
import type { PathUtils } from '@lapidist/design-lint-shared';
import { nodeEnv } from '@lapidist/design-lint-shared';
import type { LintResult } from './types.js';

export interface CacheEntry {
  mtime: number;
  size?: number;
  result: LintResult;
}
export type Cache = FlatCache;

export function loadCache(
  cacheLocation: string,
  pathUtils: PathUtils = nodeEnv.path,
): Cache {
  const cacheId = pathUtils.basename(cacheLocation);
  const cacheDir = pathUtils.dirname(cacheLocation);
  return flatCache.create({ cacheId, cacheDir });
}
