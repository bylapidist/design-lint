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
import type { PluginMeta } from './plugin-manager.js';
import { TokenTracker } from './token-tracker.js';
import { Runner } from './runner.js';
import type {
  LintDocument,
  Environment,
  TokenProvider,
} from './environment.js';
import type { CacheProvider } from './cache-provider.js';
import { LintService } from './lint-service.js';
import { parserRegistry } from './parser-registry.js';
import { FILE_TYPE_MAP } from './file-types.js';

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
  private tokensReady: Promise<void>;
  private service?: LintService;
  constructor(
    config: Config,
    depsOrEnv:
      | {
          ruleRegistry: RuleRegistry;
          tokenTracker: TokenTracker;
          tokensReady: Promise<Record<string, DesignTokens>>;
        }
      | Environment,
  ) {
    const isEnv = (val: unknown): val is Environment =>
      typeof val === 'object' && val !== null && 'documentSource' in val;

    let resolvedConfig: ResolvedConfig = {
      ...config,
      tokens: config.tokens ?? {},
    };
    let deps:
      | {
          ruleRegistry: RuleRegistry;
          tokenTracker: TokenTracker;
          tokensReady: Promise<Record<string, DesignTokens>>;
        }
      | undefined;
    let env: Environment | undefined;

    if (isEnv(depsOrEnv)) {
      env = depsOrEnv;
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
      resolvedConfig = {
        ...config,
        tokens: inlineTokens ?? {},
      };
      const ruleRegistry = new RuleRegistry(resolvedConfig, env);
      const tokenTracker = new TokenTracker(provider);
      deps = {
        ruleRegistry,
        tokenTracker,
        tokensReady: ruleRegistry.load().then(() => provider.load()),
      };
    } else {
      deps = depsOrEnv;
    }

    this.config = resolvedConfig;
    this.ruleRegistry = deps.ruleRegistry;
    this.tokenTracker = deps.tokenTracker;
    this.tokensReady = deps.tokensReady.then((t) => {
      this.tokensByTheme = t;
    });

    if (env) {
      const service = new LintService(this, resolvedConfig, env);
      this.setService(service);
    }
  }

  setService(service: LintService): void {
    this.service = service;
  }

  async lintDocument(doc: LintDocument, fix = false): Promise<LintResult> {
    const { results } = await this.lintDocuments([doc], fix);
    const [res] = results;
    return res;
  }

  async lintDocuments(
    documents: LintDocument[],
    fix = false,
    cache?: CacheProvider,
  ): Promise<{
    results: LintResult[];
    ignoreFiles: string[];
    warning?: string;
  }> {
    await this.ruleRegistry.load();
    await this.tokensReady;
    const runner = new Runner({
      config: this.config,
      tokenTracker: this.tokenTracker,
      lintDocument: this.lintText.bind(this),
    });
    return runner.run(documents, fix, cache);
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
    if (!this.service) {
      throw new Error('Lint service not configured');
    }
    return this.service.lintTargets(targets, fix, ignore);
  }

  /**
   * Retrieves completions for design token references.
   *
   * @returns A map of theme names to arrays of token paths available in that theme.
   */
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

  async getPluginMetadata(): Promise<PluginMeta[]> {
    return this.ruleRegistry.getPluginMetadata();
  }

  /**
   * Lints a single text document and returns linting results.
   *
   * @param text - The source text to lint.
   * @param sourceId - Identifier for the document, typically a file path.
   * @param docType - Optional file type override for parser selection.
   * @param metadata - Optional metadata passed to rules via context.
   * @returns A {@link LintResult} describing issues found in the text.
   */
  private async lintText(
    text: string,
    sourceId = 'unknown',
    docType?: string,
    metadata?: Record<string, unknown>,
  ): Promise<LintResult> {
    await this.ruleRegistry.load();
    await this.tokensReady;
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

  /**
   * Constructs rule execution contexts and collects rule metadata.
   *
   * @param enabled - The enabled rules and their configuration.
   * @param sourceId - Identifier for the document being linted.
   * @param metadata - Optional metadata to expose to rules.
   * @returns Listeners, rule descriptions, categories, and a mutable message store.
   */
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

  /**
   * Executes the appropriate parser for the given document and dispatches tokens to rule listeners.
   *
   * @param text - The source text to parse.
   * @param sourceId - Identifier for the document, typically a file path.
   * @param docType - Explicit file type, otherwise inferred from {@link sourceId}.
   * @param listeners - Rule listeners generated by {@link buildRuleContexts}.
   * @param messages - Mutable list of lint messages to populate during parsing.
   */
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

  /**
   * Removes messages that have been suppressed with inline disable comments.
   *
   * @param text - The source text to inspect for disable directives.
   * @param messages - Messages produced during linting.
   * @returns The subset of messages that are not disabled.
   */
  protected filterDisabledMessages(
    text: string,
    messages: LintMessage[],
  ): LintMessage[] {
    const disabledLines = getDisabledLines(text);
    return messages.filter((m) => !disabledLines.has(m.line));
  }
}

export { applyFixes } from './apply-fixes.js';

function isDesignTokens(val: unknown): val is DesignTokens {
  return typeof val === 'object' && val !== null;
}

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

export function inferFileType(sourceId: string): string {
  const ext = sourceId.split('.').pop()?.toLowerCase() ?? '';
  return FILE_TYPE_MAP[ext] ?? ext;
}
