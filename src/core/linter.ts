import type {
  LintResult,
  DesignTokens,
  LintMessage,
  RuleContext,
} from './types.js';
import { mergeTokens, extractVarName } from './token-utils.js';
export { defaultIgnore } from './ignore.js';
import { RuleRegistry } from './rule-registry.js';
import { TokenTracker } from './token-tracker.js';
import { Runner } from './runner.js';
import type {
  Environment,
  LintDocument,
  TokenProvider,
} from './environment.js';
import { parserRegistry } from './parser-registry.js';

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
  private source: Environment['documentSource'];
  private cache?: Environment['cacheProvider'];
  private tokensReady: Promise<void>;

  constructor(config: Config, env: Environment) {
    const provider: TokenProvider = env.tokenProvider ?? {
      load: () =>
        Promise.resolve({
          themes: (config.tokens ? { default: config.tokens } : {}) as Record<
            string,
            DesignTokens
          >,
          merged: (config.tokens ?? {}) as DesignTokens,
        }),
    };
    this.config = { ...config, tokens: {} };
    this.ruleRegistry = new RuleRegistry(this.config, env.pluginLoader);
    this.tokenTracker = new TokenTracker(provider);
    this.source = env.documentSource;
    this.cache = env.cacheProvider;
    this.tokensReady = provider.load().then((t) => {
      this.tokensByTheme = t.themes;
      this.config.tokens = t.merged;
    });
  }

  async lintDocument(doc: LintDocument, fix = false): Promise<LintResult> {
    const { results } = await this.lintDocuments([doc], fix);
    const [res] = results;
    return res;
  }

  async lintDocuments(
    documents: LintDocument[],
    fix = false,
  ): Promise<{
    results: LintResult[];
    ignoreFiles: string[];
    warning?: string;
  }> {
    await this.tokensReady;
    await this.ruleRegistry.load();
    const runner = new Runner({
      config: this.config,
      tokenTracker: this.tokenTracker,
      lintDocument: this.lintText.bind(this),
    });
    return runner.run(documents, fix, this.cache);
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
    } = await this.lintDocuments(documents, fix);
    const ignoreFiles = Array.from(new Set([...scanIgnores, ...runIgnores]));
    return {
      results,
      ignoreFiles,
      warning: scanWarning ?? runWarning,
    };
  }

  getTokenCompletions(): Record<string, string[]> {
    const tokens = this.config.tokens;
    const completions: Record<string, string[]> = {};
    for (const [group, defs] of Object.entries(tokens)) {
      if (group === 'variables' && isRecord(defs)) {
        const names: string[] = [];
        for (const v of Object.values(defs)) {
          if (isRecord(v) && typeof v.id === 'string') names.push(v.id);
        }
        if (names.length) completions[group] = names;
        continue;
      }
      if (Array.isArray(defs)) {
        const names = defs.filter((t): t is string => typeof t === 'string');
        if (names.length) completions[group] = names;
      } else if (isRecord(defs)) {
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
    sourceId = 'unknown',
    docType?: string,
    metadata?: Record<string, unknown>,
  ): Promise<LintResult> {
    await this.tokensReady;
    await this.ruleRegistry.load();
    const enabled = this.ruleRegistry.getEnabledRules();
    await this.tokenTracker.configure(enabled);
    if (this.tokenTracker.hasUnusedTokenRules()) {
      await this.tokenTracker.trackUsage(text);
    }
    const messages: LintMessage[] = [];
    const ruleDescriptions: Record<string, string> = {};
    const ruleCategories: Record<string, string> = {};
    const disabledLines = getDisabledLines(text);
    const listeners = enabled.map(({ rule, options, severity }) => {
      ruleDescriptions[rule.name] = rule.meta.description;
      if (rule.meta.category) {
        ruleCategories[rule.name] = rule.meta.category;
      }
      const themes =
        isRecord(options) && isStringArray(options.themes)
          ? options.themes
          : undefined;
      const tokens = mergeTokens(this.tokensByTheme, themes);
      const ctx: RuleContext = {
        sourceId,
        tokens,
        options,
        metadata,
        report: (m) => messages.push({ ...m, severity, ruleId: rule.name }),
      };
      return rule.create(ctx);
    });
    const type = docType ?? inferFileType(sourceId);
    const parser = parserRegistry[type];
    if (parser) {
      await parser(text, sourceId, listeners, messages);
    }
    const filtered = messages.filter((m) => !disabledLines.has(m.line));
    return {
      sourceId,
      messages: filtered,
      ruleDescriptions,
      ruleCategories,
    };
  }
}

export { applyFixes } from './apply-fixes.js';

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

function inferFileType(sourceId: string): string {
  const ext = sourceId.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'ts',
    tsx: 'ts',
    mts: 'ts',
    cts: 'ts',
    js: 'ts',
    jsx: 'ts',
    mjs: 'ts',
    cjs: 'ts',
    css: 'css',
    scss: 'css',
    sass: 'css',
    less: 'css',
    vue: 'vue',
    svelte: 'svelte',
  };
  return map[ext] ?? ext;
}
