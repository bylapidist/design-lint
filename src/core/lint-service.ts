import type { Config } from './linter.js';
import type { Environment } from './environment.js';
import type { LintResult } from './types.js';
import { Linter } from './linter.js';

export class LintService {
  private config: Config;
  private source: Environment['documentSource'];
  private cache?: Environment['cacheProvider'];
  private linter: Linter;

  constructor(linter: Linter, config: Config, env: Environment) {
    this.linter = linter;
    this.config = config;
    this.source = env.documentSource;
    this.cache = env.cacheProvider;
  }

  async lintTargets(
    targets: string[],
    fix = false,
    ignore: string[] = [],
  ): Promise<{
    results: LintResult[];
    ignoreFiles: string[];
    warning?: string;
  }> {
    const {
      documents,
      ignoreFiles: scanIgnores,
      warning: scanWarning,
    } = await this.source.scan(targets, this.config, ignore);
    const {
      results,
      ignoreFiles: runIgnores,
      warning: runWarning,
    } = await this.linter.lintDocuments(documents, fix, this.cache);
    const ignoreFiles = Array.from(new Set([...scanIgnores, ...runIgnores]));
    return {
      results,
      ignoreFiles,
      warning: scanWarning ?? runWarning,
    };
  }
}
