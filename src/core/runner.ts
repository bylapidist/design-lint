import pLimit from 'p-limit';
import os from 'node:os';
import type { Config } from './linter.js';
import type { Cache } from './cache.js';
import type { LintResult } from './types.js';
import { CacheService } from './cache-service.js';
import { TokenTracker } from './token-tracker.js';
import type { LintDocument } from './document-source.js';

export interface RunnerOptions {
  config: Config;
  tokenTracker: TokenTracker;
  lintDocument: (
    text: string,
    filePath: string,
    metadata?: Record<string, unknown>,
  ) => Promise<LintResult>;
}

export class Runner {
  private config: Config;
  private tokenTracker: TokenTracker;
  private lintDocumentFn: (
    text: string,
    filePath: string,
    metadata?: Record<string, unknown>,
  ) => Promise<LintResult>;

  constructor(options: RunnerOptions) {
    this.config = options.config;
    this.tokenTracker = options.tokenTracker;
    this.lintDocumentFn = options.lintDocument;
  }

  async run(
    documents: LintDocument[],
    fix = false,
    cache?: Cache,
    cacheLocation?: string,
  ): Promise<{
    results: LintResult[];
    ignoreFiles: string[];
    warning?: string;
  }> {
    const ignoreFiles: string[] = [];
    if (documents.length === 0) {
      return {
        results: [],
        ignoreFiles,
        warning: 'No files matched the provided patterns.',
      };
    }
    CacheService.prune(
      cache,
      documents.map((d) => d.id),
    );
    const concurrency = Math.max(
      1,
      Math.floor(this.config.concurrency ?? os.cpus().length),
    );
    const limit = pLimit(concurrency);
    const cacheManager = CacheService.createManager(cache, fix);
    const tasks = documents.map((doc) =>
      limit(() => cacheManager.processDocument(doc, this.lintDocumentFn)),
    );
    const results = await Promise.all(tasks);
    results.push(
      ...this.tokenTracker.generateReports(
        this.config.configPath ?? 'designlint.config',
      ),
    );
    CacheService.save(cacheManager, cacheLocation);
    return { results, ignoreFiles };
  }
}
