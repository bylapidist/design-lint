import { promises as fs } from 'fs';
import path from 'path';
import writeFileAtomic from 'write-file-atomic';
import { z } from 'zod';
import type { LintResult } from './types.js';

export type CacheMap = Map<string, { mtime: number; result: LintResult }>;

const LintMessageSchema = z.object({
  ruleId: z.string(),
  message: z.string(),
  severity: z.union([z.literal('error'), z.literal('warn')]),
  line: z.number(),
  column: z.number(),
  fix: z
    .object({
      range: z.tuple([z.number(), z.number()]),
      text: z.string(),
    })
    .optional(),
});

const LintResultSchema = z.object({
  filePath: z.string(),
  messages: z.array(LintMessageSchema),
  ruleDescriptions: z.record(z.string(), z.string()).optional(),
});

const CacheEntrySchema = z.tuple([
  z.string(),
  z.object({
    mtime: z.number(),
    result: LintResultSchema,
  }),
]);

const CacheSchema = z.array(CacheEntrySchema);

export async function loadCache(
  cache: CacheMap,
  cacheLocation: string,
): Promise<void> {
  let raw: string;
  try {
    raw = await fs.readFile(cacheLocation, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Failed to read cache at ${cacheLocation}:`, err);
    }
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`Failed to parse cache at ${cacheLocation}:`, err);
    return;
  }

  const result = CacheSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      `Invalid cache format at ${cacheLocation}:`,
      result.error.toString(),
    );
    return;
  }

  for (const [k, v] of result.data) cache.set(k, v);
}

export async function saveCache(
  cache: CacheMap,
  cacheLocation: string,
): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cacheLocation), { recursive: true });
    await writeFileAtomic(cacheLocation, JSON.stringify([...cache.entries()]), {
      encoding: 'utf8',
    });
  } catch {
    // ignore
  }
}
