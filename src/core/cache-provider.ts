import type { LintResult } from './types';

export interface CacheEntry {
  mtime: number;
  size?: number;
  result: LintResult;
}

export interface CacheProvider {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  save(): Promise<void>;
}
