import type { LintResult, LintMessage, Fix } from './types.js';

export interface CacheEntry {
  mtime: number;
  size?: number;
  result: LintResult;
}

export interface Cache {
  keys(): string[];
  save(persist?: boolean): void;
  removeKey(key: string): void;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  getKey<T>(key: string): T | undefined;
  setKey(key: string, value: CacheEntry): void;
}

export interface CacheManager {
  processFile(
    filePath: string,
    lintFn: (
      text: string,
      filePath: string,
      metadata?: Record<string, unknown>,
    ) => Promise<LintResult>,
  ): Promise<LintResult>;
  save(cacheLocation?: string): void;
}

export interface CacheService {
  prune(cache: Cache | undefined, files: string[]): void;
  createManager(cache: Cache | undefined, fix: boolean): CacheManager;
  save(manager: CacheManager, cacheLocation?: string): void;
}

export type { LintMessage, Fix };
