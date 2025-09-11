import { stat, writeFile } from 'node:fs/promises';
import type { CacheProvider } from './cache-provider';
import type { LintResult } from './types';
import type { LintDocument } from './environment';
import { applyFixes } from './apply-fixes';

export class CacheManager {
  constructor(
    private cache: CacheProvider | undefined,
    private fix: boolean,
  ) {}

  async processDocument(
    doc: LintDocument,
    lintFn: (
      text: string,
      sourceId: string,
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
        sourceId: doc.id,
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

  async save(): Promise<void> {
    if (this.cache) {
      await this.cache.save();
    }
  }
}
