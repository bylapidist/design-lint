import { Linter, type Config } from './linter.js';
import type { Environment, TokenProvider } from './environment.js';
import { RuleRegistry } from './rule-registry.js';
import { TokenTracker } from './token-tracker.js';
import { LintService } from './lint-service.js';
import { ensureDtifFlattenedTokens } from '../utils/tokens/dtif-cache.js';
import type { DesignTokens } from './types.js';

function isDesignTokens(val: unknown): val is DesignTokens {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function setupLinter(
  config: Config,
  env: Environment,
  onWarn?: (msg: string) => void,
): { linter: Linter; service: LintService } {
  const inlineTokens = config.tokens;
  const defaultProvider: TokenProvider = {
    load: async () => {
      if (inlineTokens && isDesignTokens(inlineTokens)) {
        await ensureDtifFlattenedTokens(inlineTokens);
        return { default: inlineTokens };
      }
      const empty: Record<string, DesignTokens> = {};
      return empty;
    },
  };
  const provider: TokenProvider = env.tokenProvider ?? defaultProvider;
  const resolvedConfig: Config = {
    ...config,
    tokens: inlineTokens ?? {},
  };
  const ruleRegistry = new RuleRegistry(resolvedConfig, env);
  const tokenTracker = new TokenTracker(provider);
  const tokensReady = ruleRegistry
    .load()
    .then(() => provider.load())
    .then(async (tokensByTheme) => {
      await Promise.all(
        Object.values(tokensByTheme).map(async (tokens) => {
          if (isDesignTokens(tokens)) {
            await ensureDtifFlattenedTokens(tokens);
          }
        }),
      );
      return tokensByTheme;
    });
  const linter = new Linter(
    resolvedConfig,
    {
      ruleRegistry,
      tokenTracker,
      tokensReady,
    },
    onWarn,
  );
  const service = new LintService(linter, resolvedConfig, env);
  linter.setService(service);
  return { linter, service };
}
