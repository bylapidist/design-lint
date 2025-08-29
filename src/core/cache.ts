import { promises as fs } from 'fs';
import path from 'path';
import type { LintResult } from './types.js';

export type CacheMap = Map<string, { mtime: number; result: LintResult }>;

export async function loadCache(
  cache: CacheMap,
  cacheLocation: string,
): Promise<void> {
  try {
    const raw = await fs.readFile(cacheLocation, 'utf8');
    const data = JSON.parse(raw) as [
      string,
      { mtime: number; result: LintResult },
    ][];
    for (const [k, v] of data) cache.set(k, v);
  } catch {
    // ignore
  }
}

export async function saveCache(
  cache: CacheMap,
  cacheLocation: string,
): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cacheLocation), { recursive: true });
    await fs.writeFile(
      cacheLocation,
      JSON.stringify([...cache.entries()]),
      'utf8',
    );
  } catch {
    // ignore
  }
}
