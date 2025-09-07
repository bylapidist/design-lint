import pLimit from 'p-limit';
import os from 'node:os';
import type { Config } from './linter.js';
import type { Cache } from './cache.js';
import type { LintResult } from './types.js';
import { FileService } from './file-service.js';
import { CacheService } from './cache-service.js';
import { TokenTracker } from './token-tracker.js';

export interface RunnerOptions {
  config: Config;
  tokenTracker: TokenTracker;
  lintText: (text: string, filePath: string) => Promise<LintResult>;
}

export class Runner {
  private config: Config;
  private tokenTracker: TokenTracker;
  private lintText: (text: string, filePath: string) => Promise<LintResult>;

  constructor(options: RunnerOptions) {
    this.config = options.config;
    this.tokenTracker = options.tokenTracker;
    this.lintText = options.lintText;
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
    const files = await FileService.scan(
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
    CacheService.prune(cache, files);
    const concurrency = Math.max(
      1,
      Math.floor(this.config.concurrency ?? os.cpus().length),
    );
    const limit = pLimit(concurrency);
    const cacheManager = CacheService.createManager(cache, fix);
    const tasks = files.map((filePath) =>
      limit(() => cacheManager.processFile(filePath, this.lintText)),
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
