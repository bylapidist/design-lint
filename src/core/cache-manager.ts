import { stat, writeFile } from 'node:fs/promises';
import type { CacheProvider } from './cache-provider.js';
import type { LintResult, LintMessage, Fix } from './types.js';
import type { LintDocument } from './document-source.js';

export class CacheManager {
  constructor(
    private cache: CacheProvider | undefined,
    private fix: boolean,
  ) {}

  async processDocument(
    doc: LintDocument,
    lintFn: (
      text: string,
      filePath: string,
      docType: string,
      metadata?: Record<string, unknown>,
    ) => Promise<LintResult>,
  ): Promise<LintResult> {
    try {
      let statResult;
      try {
        statResult = await stat(doc.id);
      } catch {
        statResult = undefined;
      }
      const cached = this.cache ? await this.cache.get(doc.id) : undefined;
      if (
        cached &&
        statResult &&
        cached.mtime === statResult.mtimeMs &&
        cached.size === statResult.size &&
        !this.fix
      ) {
        return cached.result;
      }
      const text = await doc.getText();
      let result = await lintFn(text, doc.id, doc.type, doc.metadata);
      let mtime = statResult?.mtimeMs ?? Date.now();
      let size = statResult?.size ?? text.length;
      if (this.fix && statResult) {
        const output = applyFixes(text, result.messages);
        if (output !== text) {
          await writeFile(doc.id, output, 'utf8');
          result = await lintFn(output, doc.id, doc.type, doc.metadata);
          const newStat = await stat(doc.id);
          mtime = newStat.mtimeMs;
          size = newStat.size;
        }
      }
      await this.cache?.set(doc.id, { mtime, size, result });
      return result;
    } catch (e: unknown) {
      await this.cache?.remove(doc.id);
      const message = e instanceof Error ? e.message : 'Failed to read file';
      const result: LintResult = {
        filePath: doc.id,
        messages: [
          {
            ruleId: 'parse-error',
            message,
            severity: 'error',
            line: 1,
            column: 1,
          },
        ],
      };
      return result;
    }
  }

  async save(cacheLocation?: string): Promise<void> {
    if (cacheLocation && this.cache) {
      await this.cache.save();
    }
  }
}

export function applyFixes(text: string, messages: LintMessage[]): string {
  const fixes: Fix[] = messages
    .filter((m): m is LintMessage & { fix: Fix } => m.fix !== undefined)
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
