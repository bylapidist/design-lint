import pLimit from 'p-limit';
import os from 'node:os';
import type { LintResult, DesignTokens } from './types.js';
import { normalizeTokens } from './token-loader.js';
import { extractVarName } from '../utils/token-match.js';
export { defaultIgnore } from './ignore.js';
import { scanFiles } from './file-scanner.js';
import type { Cache } from './cache.js';
import { RuleRegistry } from './rule-registry.js';
import { ParserService } from './parser-service.js';
import { TokenTracker } from './token-tracker.js';
import { CacheManager } from './cache-manager.js';

export interface Config {
  tokens?: DesignTokens | Record<string, DesignTokens>;
  rules?: Record<string, unknown>;
  ignoreFiles?: string[];
  plugins?: string[];
  configPath?: string;
  concurrency?: number;
  patterns?: string[];
  wrapTokensWithVar?: boolean;
}

/**
 * Lints files using built-in and plugin-provided rules.
 */
export class Linter {
  private config: Config;
  private tokensByTheme: Record<string, DesignTokens> = {};
  private ruleRegistry: RuleRegistry;
  private parser: ParserService;
  private tokenTracker: TokenTracker;

  constructor(config: Config) {
    const normalized = normalizeTokens(
      config.tokens as DesignTokens | Record<string, DesignTokens>,
      config.wrapTokensWithVar ?? false,
    );
    this.tokensByTheme = normalized.themes;
    this.config = { ...config, tokens: normalized.merged };
    this.ruleRegistry = new RuleRegistry(this.config);
    this.tokenTracker = new TokenTracker(this.config.tokens as DesignTokens);
    this.parser = new ParserService(this.tokensByTheme);
  }

  async lintFile(
    filePath: string,
    fix = false,
    cache?: Cache,
    ignorePaths?: string[],
    cacheLocation?: string,
  ): Promise<LintResult> {
    const { results } = await this.lintFiles(
      [filePath],
      fix,
      cache,
      ignorePaths ?? [],
      cacheLocation,
    );
    const [res] = results;
    return res ?? { filePath, messages: [] };
  }

  async lintFiles(
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
    await this.ruleRegistry.load();
    const files = await scanFiles(targets, this.config, additionalIgnorePaths);
    const ignoreFiles: string[] = [];
    if (files.length === 0) {
      return {
        results: [],
        ignoreFiles,
        warning: 'No files matched the provided patterns.',
      };
    }
    if (cache) {
      for (const key of cache.keys()) {
        if (!files.includes(key)) cache.removeKey(key);
      }
    }
    const concurrency = Math.max(
      1,
      Math.floor(this.config.concurrency ?? os.cpus().length),
    );
    const limit = pLimit(concurrency);
    const cacheManager = new CacheManager(cache, fix);
    const tasks = files.map((filePath) =>
      limit(() => cacheManager.processFile(filePath, this.lintText.bind(this))),
    );
    const results = await Promise.all(tasks);
    results.push(
      ...this.tokenTracker.generateReports(
        this.config.configPath || 'designlint.config',
      ),
    );
    cacheManager.save(cacheLocation);
    return { results, ignoreFiles };
  }

  getTokenCompletions(): Record<string, string[]> {
    const tokens = (this.config.tokens || {}) as DesignTokens;
    const completions: Record<string, string[]> = {};
    for (const [group, defs] of Object.entries(tokens)) {
      if (Array.isArray(defs)) {
        const names = defs.filter((t): t is string => typeof t === 'string');
        if (names.length) completions[group] = names;
      } else if (defs && typeof defs === 'object') {
        const names: string[] = [];
        for (const val of Object.values(defs)) {
          const v = typeof val === 'string' ? extractVarName(val) : null;
          if (v) names.push(v);
        }
        if (names.length) completions[group] = names;
      }
    }
    return completions;
  }

  async getPluginPaths(): Promise<string[]> {
    return this.ruleRegistry.getPluginPaths();
  }

  private async lintText(
    text: string,
    filePath = 'unknown',
  ): Promise<LintResult> {
    await this.ruleRegistry.load();
    const enabled = this.ruleRegistry.getEnabledRules();
    this.tokenTracker.configure(enabled);
    if (this.tokenTracker.hasUnusedTokenRules()) {
      this.tokenTracker.trackUsage(text);
    }
    return this.parser.lintText(text, filePath, enabled);
  }
}

export { applyFixes } from './cache-manager.js';
