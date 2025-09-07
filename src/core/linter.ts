import { promises as fs } from 'fs';
import pLimit from 'p-limit';
import os from 'node:os';
import type { LintResult, LintMessage, DesignTokens, Fix } from './types.js';
import type { Cache } from './cache.js';
import { normalizeTokens } from './token-loader.js';
import { scanFiles } from './file-scanner.js';
import { RuleRegistry } from './rule-registry.js';
import { ParserService } from './parser-service.js';
import { TokenTracker } from './token-tracker.js';
import { CacheManager } from './cache-manager.js';
export { defaultIgnore } from './ignore.js';

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
  private unusedTokenRules: {
    ruleId: string;
    severity: 'error' | 'warn';
    ignored: Set<string>;
  }[] = [];

  /**
   * Create a new Linter instance.
   * @param config Linter configuration.
   */
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

  /**
   * Lint a single file.
   */
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

  /**
   * Lint multiple files or directories.
   */
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
    await this.ruleRegistry.ready;
    const files = await scanFiles(targets, this.config, additionalIgnorePaths);
    const ignoreFiles: string[] = [];
    if (files.length === 0) {
      return {
        results: [],
        ignoreFiles,
        warning: 'No files matched the provided patterns.',
      };
    }
    const cacheManager = new CacheManager(cache, cacheLocation);
    cacheManager.reconcile(files);
    const concurrency = Math.max(
      1,
      Math.floor(this.config.concurrency ?? os.cpus().length),
    );
    const limit = pLimit(concurrency);
    const tasks = files.map((filePath) =>
      limit(async () => {
        try {
          const stat = await fs.stat(filePath);
          const cached = cacheManager.getCachedResult(filePath, stat, fix);
          if (cached) return cached;
          const text = await fs.readFile(filePath, 'utf8');
          let result = await this.lintText(text, filePath);
          let mtime = stat.mtimeMs;
          let size = stat.size;
          if (fix) {
            const output = applyFixes(text, result.messages);
            if (output !== text) {
              await fs.writeFile(filePath, output, 'utf8');
              result = await this.lintText(output, filePath);
              const newStat = await fs.stat(filePath);
              mtime = newStat.mtimeMs;
              size = newStat.size;
            }
          }
          cacheManager.setCachedResult(
            filePath,
            { mtimeMs: mtime, size },
            result,
          );
          return result;
        } catch (e: unknown) {
          cacheManager.remove(filePath);
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
      }),
    );
    const results = await Promise.all(tasks);
    const unused = this.tokenTracker.getUnusedTokenResults(
      this.unusedTokenRules,
      this.config.configPath || 'designlint.config',
    );
    results.push(...unused);
    cacheManager.save();
    return { results, ignoreFiles };
  }

  /**
   * Lint raw text.
   */
  async lintText(text: string, filePath = 'unknown'): Promise<LintResult> {
    await this.ruleRegistry.ready;
    const enabled = this.ruleRegistry.getEnabledRules();
    const unusedRules = enabled.filter(
      (e) => e.rule.name === 'design-system/no-unused-tokens',
    );
    if (unusedRules.length) {
      this.unusedTokenRules = unusedRules.map((u) => ({
        ruleId: u.rule.name,
        severity: u.severity,
        ignored: new Set(
          ((u.options as { ignore?: string[] }) || {}).ignore || [],
        ),
      }));
      this.tokenTracker.track(text);
    }
    const { messages, ruleDescriptions } = await this.parser.parse(
      text,
      filePath,
      enabled,
    );
    return { filePath, messages, ruleDescriptions };
  }

  /**
   * Retrieve token names for editor completions.
   */
  getTokenCompletions(): Record<string, string[]> {
    return this.tokenTracker.getCompletions();
  }
}

/**
 * Apply fixes to source text.
 */
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
    const [start, end] = filtered[i].range;
    text = text.slice(0, start) + filtered[i].text + text.slice(end);
  }
  return text;
}
