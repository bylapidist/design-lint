import { promises as fs } from 'fs';
import type { Cache, CacheEntry } from './cache.js';
import type { LintResult, LintMessage, Fix } from './types.js';

export class CacheManager {
  constructor(
    private cache: Cache | undefined,
    private fix: boolean,
  ) {}

  async processFile(
    filePath: string,
    lintFn: (text: string, filePath: string) => Promise<LintResult>,
  ): Promise<LintResult> {
    try {
      const stat = await fs.stat(filePath);
      const cached = this.cache?.getKey<CacheEntry>(filePath);
      if (
        cached &&
        cached.mtime === stat.mtimeMs &&
        cached.size === stat.size &&
        !this.fix
      ) {
        return cached.result;
      }
      const text = await fs.readFile(filePath, 'utf8');
      let result = await lintFn(text, filePath);
      let mtime = stat.mtimeMs;
      let size = stat.size;
      if (this.fix) {
        const output = applyFixes(text, result.messages);
        if (output !== text) {
          await fs.writeFile(filePath, output, 'utf8');
          result = await lintFn(output, filePath);
          const newStat = await fs.stat(filePath);
          mtime = newStat.mtimeMs;
          size = newStat.size;
        }
      }
      this.cache?.setKey(filePath, { mtime, size, result });
      return result;
    } catch (e: unknown) {
      this.cache?.removeKey(filePath);
      const err = e as { message?: string };
      return {
        filePath,
        messages: [
          {
            ruleId: 'parse-error',
            message: err.message || 'Failed to read file',
            severity: 'error',
            line: 1,
            column: 1,
          },
        ],
      } as LintResult;
    }
  }

  save(cacheLocation?: string): void {
    if (cacheLocation && this.cache) {
      this.cache.save(true);
    }
  }
}

export function applyFixes(text: string, messages: LintMessage[]): string {
  const fixes: Fix[] = messages
    .filter((m): m is LintMessage & { fix: Fix } => !!m.fix)
    .map((m) => m.fix);
  if (fixes.length === 0) return text;
  fixes.sort((a, b) => a.range[0] - b.range[0]);
  const filtered: Fix[] = [];
  let lastEnd = -1;
  for (const f of fixes) {
    if (f.range[0] < lastEnd) continue;
    filtered.push(f);
    lastEnd = f.range[1];
  }
  for (let i = filtered.length - 1; i >= 0; i--) {
    const f = filtered[i];
    text = text.slice(0, f.range[0]) + f.text + text.slice(f.range[1]);
  }
  return text;
}
