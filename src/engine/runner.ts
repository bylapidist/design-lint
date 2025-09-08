import pLimit from 'p-limit';
import type { Config } from './linter.js';
import type { Cache, CacheService } from './cache.js';
import type { LintResult } from './types.js';
import type { DocumentSource } from './document-source.js';
import { TokenTracker } from './token-tracker.js';

export interface RunnerOptions {
  config: Config;
  tokenTracker: TokenTracker;
  lintText: (
    text: string,
    filePath: string,
    metadata?: Record<string, unknown>,
  ) => Promise<LintResult>;
  source: DocumentSource;
  cacheService: CacheService;
}

export class Runner {
  private config: Config;
  private tokenTracker: TokenTracker;
  private lintText: (
    text: string,
    filePath: string,
    metadata?: Record<string, unknown>,
  ) => Promise<LintResult>;
  private source: DocumentSource;
  private cacheService: CacheService;

  constructor(options: RunnerOptions) {
    this.config = options.config;
    this.tokenTracker = options.tokenTracker;
    this.lintText = options.lintText;
    this.source = options.source;
    this.cacheService = options.cacheService;
  }

  async run(
    targets: string[],
    fix = false,
    cache?: Cache,
    additionalIgnorePaths: string[] = [],
    cacheLocation?: string,
  ): Promise<{
    results: LintResult[];
    ignoreFiles: string[];
    warning?: string;
  }> {
    const files = await this.source.scan(
      targets,
      this.config,
      additionalIgnorePaths,
    );
    const ignoreFiles: string[] = [];
    if (files.length === 0) {
      return {
        results: [],
        ignoreFiles,
        warning: 'No files matched the provided patterns.',
      };
    }
    this.cacheService.prune(cache, files);
    const concurrency = Math.max(1, Math.floor(this.config.concurrency ?? 1));
    const limit = pLimit(concurrency);
    const cacheManager = this.cacheService.createManager(cache, fix);
    const tasks = files.map((filePath) =>
      limit(() => cacheManager.processFile(filePath, this.lintText)),
    );
    const results = await Promise.all(tasks);
    results.push(
      ...this.tokenTracker.generateReports(
        this.config.configPath ?? 'designlint.config',
      ),
    );
    this.cacheService.save(cacheManager, cacheLocation);
    return { results, ignoreFiles };
  }
}
