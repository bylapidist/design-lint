import type {
  LintResult,
  LintMessage,
  RuleContext,
  DesignTokens,
  RuleModule,
} from './types.js';
import { getFlattenedTokens as flattenTokens } from './token-utils.js';
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

function isDesignTokens(val: unknown): val is DesignTokens {
  return typeof val === 'object' && val !== null;
}

export interface Config {
  tokens?:
    | DesignTokens
    | Record<string, DesignTokens | string>
    | Record<string, unknown>;
  rules?: Record<string, unknown>;
  ignoreFiles?: string[];
  plugins?: string[];
  configPath?: string;
  concurrency?: number;
  patterns?: string[];
  wrapTokensWithVar?: boolean;
}

interface ResolvedConfig extends Omit<Config, 'tokens'> {
  tokens: Record<string, unknown>;
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
    const inlineTokens = config.tokens;
    const provider: TokenProvider = env.tokenProvider ?? {
      load: () => {
        if (inlineTokens && isDesignTokens(inlineTokens)) {
          flattenTokens({ default: inlineTokens });
          return Promise.resolve({ default: inlineTokens });
        }
        return Promise.resolve({});
      },
    };
    const tokensConfig = inlineTokens ?? {};
    this.config = {
      ...config,
      tokens: tokensConfig,
    };
    this.ruleRegistry = new RuleRegistry(this.config, env.pluginLoader);
    this.tokenTracker = new TokenTracker(provider);
    this.source = env.documentSource;
    this.cache = env.cacheProvider;
    this.tokensReady = provider.load().then((t) => {
      this.tokensByTheme = t;
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
    const completions: Record<string, string[]> = {};
    for (const theme of Object.keys(this.tokensByTheme)) {
      const flat = flattenTokens(this.tokensByTheme, theme);
      if (flat.length) {
        completions[theme] = flat.map((t) => t.path);
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
    const { listeners, ruleDescriptions, ruleCategories, messages } =
      this.buildRuleContexts(enabled, sourceId, metadata);
    await this.runParser(text, sourceId, docType, listeners, messages);
    const filtered = this.filterDisabledMessages(text, messages);
    return {
      sourceId,
      messages: filtered,
      ruleDescriptions,
      ruleCategories,
    };
  }

  protected buildRuleContexts(
    enabled: ReturnType<RuleRegistry['getEnabledRules']>,
    sourceId: string,
    metadata?: Record<string, unknown>,
  ): {
    listeners: ReturnType<RuleModule['create']>[];
    ruleDescriptions: Record<string, string>;
    ruleCategories: Record<string, string>;
    messages: LintMessage[];
  } {
    const messages: LintMessage[] = [];
    const ruleDescriptions: Record<string, string> = {};
    const ruleCategories: Record<string, string> = {};
    const listeners = enabled.map(({ rule, options, severity }) => {
      ruleDescriptions[rule.name] = rule.meta.description;
      if (rule.meta.category) {
        ruleCategories[rule.name] = rule.meta.category;
      }
      const ctx: RuleContext = {
        sourceId,
        options,
        metadata,
        report: (m) => messages.push({ ...m, severity, ruleId: rule.name }),
        getFlattenedTokens: (type?: string, theme?: string) => {
          const tokens = flattenTokens(this.tokensByTheme, theme);
          return type
            ? tokens.filter(({ token }) => token.$type === type)
            : tokens;
        },
      };
      return rule.create(ctx);
    });
    return { listeners, ruleDescriptions, ruleCategories, messages };
  }

  protected async runParser(
    text: string,
    sourceId: string,
    docType: string | undefined,
    listeners: ReturnType<RuleModule['create']>[],
    messages: LintMessage[],
  ): Promise<void> {
    const type = docType ?? inferFileType(sourceId);
    const parser = parserRegistry[type];
    if (parser) {
      await parser(text, sourceId, listeners, messages);
    }
  }

  protected filterDisabledMessages(
    text: string,
    messages: LintMessage[],
  ): LintMessage[] {
    const disabledLines = getDisabledLines(text);
    return messages.filter((m) => !disabledLines.has(m.line));
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
