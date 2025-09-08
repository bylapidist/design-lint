import type {
  LintResult,
  DesignTokens,
  LintMessage,
  RuleContext,
} from './types.js';
import { normalizeTokens, mergeTokens, extractVarName } from './token-utils.js';
export { defaultIgnore } from './ignore.js';
import type { Cache } from './cache.js';
import { RuleRegistry } from './rule-registry.js';
import { TokenTracker } from './token-tracker.js';
import { Runner } from './runner.js';
import type { DocumentSource } from './document-source.js';
import { FileSource } from './file-source.js';
import { parserRegistry } from './parser-registry.js';
import path from 'node:path';

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

interface ResolvedConfig extends Omit<Config, 'tokens'> {
  tokens: DesignTokens;
}

/**
 * Lints files using built-in and plugin-provided rules.
 */
export class Linter {
  private config: ResolvedConfig;
  private tokensByTheme: Record<string, DesignTokens> = {};
  private ruleRegistry: RuleRegistry;
  private tokenTracker: TokenTracker;
  private source: DocumentSource;

  constructor(config: Config, source: DocumentSource = new FileSource()) {
    const normalized = normalizeTokens(
      config.tokens,
      config.wrapTokensWithVar ?? false,
    );
    this.tokensByTheme = normalized.themes;
    this.config = { ...config, tokens: normalized.merged };
    this.ruleRegistry = new RuleRegistry(this.config);
    this.tokenTracker = new TokenTracker(this.config.tokens);
    this.source = source;
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
      ignorePaths,
      cacheLocation,
    );
    const [res] = results;
    return res;
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
    const runner = new Runner({
      config: this.config,
      tokenTracker: this.tokenTracker,
      lintText: this.lintText.bind(this),
      source: this.source,
    });
    return runner.run(
      targets,
      fix,
      cache,
      additionalIgnorePaths,
      cacheLocation,
    );
  }

  getTokenCompletions(): Record<string, string[]> {
    const tokens = this.config.tokens;
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
    const messages: LintMessage[] = [];
    const ruleDescriptions: Record<string, string> = {};
    const disabledLines = getDisabledLines(text);
    const listeners = enabled.map(({ rule, options, severity }) => {
      ruleDescriptions[rule.name] = rule.meta.description;
      const themes =
        isRecord(options) && isStringArray(options.themes)
          ? options.themes
          : undefined;
      const tokens = mergeTokens(this.tokensByTheme, themes);
      const ctx: RuleContext = {
        filePath,
        tokens,
        options,
        report: (m) => messages.push({ ...m, severity, ruleId: rule.name }),
      };
      return rule.create(ctx);
    });
    const ext = path.extname(filePath).toLowerCase();
    const parser = parserRegistry[ext];
    if (parser) {
      await parser(text, filePath, listeners, messages);
    }
    const filtered = messages.filter((m) => !disabledLines.has(m.line));
    return { filePath, messages: filtered, ruleDescriptions };
  }
}

export { applyFixes } from './cache-manager.js';

function getDisabledLines(text: string): Set<number> {
  const disabled = new Set<number>();
  const lines = text.split(/\r?\n/);
  let block = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\/\*\s*design-lint-disable\s*\*\//.test(line)) {
      block = true;
      continue;
    }
    if (/\/\*\s*design-lint-enable\s*\*\//.test(line)) {
      block = false;
      continue;
    }
    if (/(?:\/\/|\/\*)\s*design-lint-disable-next-line/.test(line)) {
      disabled.add(i + 2);
      continue;
    }
    if (line.includes('design-lint-disable-line')) {
      disabled.add(i + 1);
      continue;
    }
    if (block) disabled.add(i + 1);
  }
  return disabled;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}
