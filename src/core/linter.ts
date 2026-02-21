import ts from 'typescript';
import type {
  LintResult,
  LintMessage,
  RuleContext,
  DesignTokens,
  RegisteredRuleListener,
  RuleSymbolResolutionHelpers,
} from './types.js';
import type { NameTransform } from '../utils/tokens/index.js';
import { TokenRegistry } from './token-registry.js';
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
import type { ParserPassResult } from './parser-registry.js';
import { FILE_TYPE_MAP } from './file-types.js';
import { ensureDtifFlattenedTokens } from '../utils/tokens/dtif-cache.js';
import { getTokenPath as deriveTokenPath } from '../utils/tokens/token-view.js';
import { isRecord } from '../utils/guards/data/is-record.js';

export interface Config {
  tokens?:
    | DesignTokens
    | Record<string, DesignTokens | string>
    | Record<string, unknown>;
  rules?: Record<string, unknown>;
  ignoreFiles?: string[];
  plugins?: string[];
  configPath?: string;
  configSources?: string[];
  concurrency?: number;
  patterns?: string[];
  wrapTokensWithVar?: boolean;
  nameTransform?: NameTransform;
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
  private tokenRegistry?: TokenRegistry;
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
        async load() {
          if (inlineTokens && isDesignTokens(inlineTokens)) {
            await ensureDtifFlattenedTokens(inlineTokens);
            return { default: inlineTokens };
          }
          const empty: Record<string, DesignTokens> = {};
          return empty;
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
      this.tokenRegistry = new TokenRegistry(t, {
        nameTransform: this.config.nameTransform,
      });
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
    if (!this.tokenRegistry) return completions;
    const transform = this.config.nameTransform;
    for (const theme of Object.keys(this.tokensByTheme)) {
      const dtifTokens = this.tokenRegistry.getDtifTokens(theme);
      if (!dtifTokens.length) continue;
      const seen = new Set<string>();
      const paths: string[] = [];
      for (const token of dtifTokens) {
        const path = deriveTokenPath(token, transform);
        if (seen.has(path)) continue;
        seen.add(path);
        paths.push(path);
      }
      if (paths.length) {
        completions[theme] = paths;
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
    const { listeners, ruleDescriptions, ruleCategories, messages } =
      this.buildRuleContexts(enabled, sourceId, metadata);
    const parserResult = await this.runParser(
      text,
      sourceId,
      docType,
      listeners,
      messages,
    );
    if (this.tokenTracker.hasUnusedTokenRules()) {
      await this.tokenTracker.trackUsage({
        references: parserResult?.tokenReferences,
        text,
      });
    }
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
    listeners: RegisteredRuleListener[];
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
        symbolResolution: createSymbolResolutionHelpers(sourceId, metadata),
        report: (m) => messages.push({ ...m, severity, ruleId: rule.name }),
        getDtifTokens: (type?: string, theme?: string) => {
          const tokens = this.tokenRegistry?.getDtifTokens(theme) ?? [];
          return type ? tokens.filter((t) => t.type === type) : tokens;
        },
        getTokenPath: (token) =>
          deriveTokenPath(token, this.config.nameTransform),
      };
      return { ruleId: rule.name, listener: rule.create(ctx) };
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
    listeners: RegisteredRuleListener[],
    messages: LintMessage[],
  ): Promise<ParserPassResult | undefined> {
    const type = docType ?? inferFileType(sourceId);
    const parser = parserRegistry[type];
    if (parser) {
      return parser(text, sourceId, listeners, messages);
    }
    return undefined;
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

function createSymbolResolutionHelpers(
  sourceId: string,
  metadata?: Record<string, unknown>,
): RuleSymbolResolutionHelpers | undefined {
  const program = resolveMetadataProgram(metadata);
  const checker = resolveTypeChecker(program, metadata);
  if (!checker) return undefined;
  const sourceFile = resolveSourceFile(sourceId, program, metadata);
  const nodeLookup = sourceFile ? createNodeLookup(sourceFile) : undefined;

  const getNodeKey = (node: ts.Node): string =>
    `${String(node.pos)}:${String(node.end)}:${String(node.kind)}`;

  const getSymbolAtLocation = (node: ts.Node): ts.Symbol | undefined => {
    const target =
      sourceFile && nodeLookup
        ? (nodeLookup.get(getNodeKey(node)) ?? node)
        : node;
    return checker.getSymbolAtLocation(target);
  };

  const getAliasedSymbol = (symbol: ts.Symbol): ts.Symbol => {
    if ((symbol.flags & ts.SymbolFlags.Alias) === 0) return symbol;
    return checker.getAliasedSymbol(symbol);
  };

  const resolveSymbol = (node: ts.Node): ts.Symbol | undefined => {
    const symbol = getSymbolAtLocation(node);
    return symbol ? getAliasedSymbol(symbol) : undefined;
  };

  const getSymbolName = (node: ts.Node): string | undefined =>
    resolveSymbol(node)?.name;

  return {
    getSymbolAtLocation,
    getAliasedSymbol,
    resolveSymbol,
    getSymbolName,
  };
}

function resolveSourceFile(
  sourceId: string,
  program: ts.Program | undefined,
  metadata?: Record<string, unknown>,
): ts.SourceFile | undefined {
  const metadataSourceFile = resolveMetadataSourceFile(metadata);
  if (metadataSourceFile) return metadataSourceFile;
  return program?.getSourceFile(sourceId);
}

function resolveTypeChecker(
  program: ts.Program | undefined,
  metadata?: Record<string, unknown>,
): ts.TypeChecker | undefined {
  const metadataChecker = resolveMetadataTypeChecker(metadata);
  if (metadataChecker) return metadataChecker;
  return program?.getTypeChecker();
}

function resolveMetadataProgram(
  metadata?: Record<string, unknown>,
): ts.Program | undefined {
  if (!metadata) return undefined;
  const direct = metadata.program;
  if (isProgram(direct)) return direct;
  const tsMetadata = getTypeScriptMetadata(metadata);
  return tsMetadata && isProgram(tsMetadata.program)
    ? tsMetadata.program
    : undefined;
}

function resolveMetadataTypeChecker(
  metadata?: Record<string, unknown>,
): ts.TypeChecker | undefined {
  if (!metadata) return undefined;
  const direct = metadata.typeChecker;
  if (isTypeChecker(direct)) return direct;
  const tsMetadata = getTypeScriptMetadata(metadata);
  return tsMetadata && isTypeChecker(tsMetadata.typeChecker)
    ? tsMetadata.typeChecker
    : undefined;
}

function resolveMetadataSourceFile(
  metadata?: Record<string, unknown>,
): ts.SourceFile | undefined {
  if (!metadata) return undefined;
  const direct = metadata.sourceFile;
  if (isSourceFile(direct)) return direct;
  const tsMetadata = getTypeScriptMetadata(metadata);
  return tsMetadata && isSourceFile(tsMetadata.sourceFile)
    ? tsMetadata.sourceFile
    : undefined;
}

function getTypeScriptMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const value = metadata.typescript;
  return isRecord(value) ? value : undefined;
}

function isProgram(value: unknown): value is ts.Program {
  return isRecord(value) && 'getTypeChecker' in value;
}

function isTypeChecker(value: unknown): value is ts.TypeChecker {
  return isRecord(value) && 'getSymbolAtLocation' in value;
}

function isSourceFile(value: unknown): value is ts.SourceFile {
  return isRecord(value) && 'statements' in value;
}

function createNodeLookup(sourceFile: ts.SourceFile): Map<string, ts.Node> {
  const lookup = new Map<string, ts.Node>();
  const visit = (node: ts.Node): void => {
    lookup.set(
      `${String(node.pos)}:${String(node.end)}:${String(node.kind)}`,
      node,
    );
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return lookup;
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
