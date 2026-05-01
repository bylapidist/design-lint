import { Linter, type Config } from './linter.js';
import type { Environment, TokenProvider } from './environment.js';
import { RuleRegistry } from './rule-registry.js';
import { TokenTracker } from './token-tracker.js';
import { LintService } from './lint-service.js';
import { ensureDtifFlattenedTokens } from '../utils/tokens/dtif-cache.js';
import type { DesignTokens, DtifFlattenedToken } from './types.js';

function isDesignTokens(val: unknown): val is DesignTokens {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function setupLinter(
  config: Config,
  env: Environment,
): { linter: Linter; service: LintService } {
  if (!env.tokenProvider) {
    throw new Error(
      'v8: Environment.tokenProvider is required. Ensure the DSR kernel is running and createNodeEnvironment was called with valid DsrOptions.',
    );
  }
  const provider: TokenProvider = env.tokenProvider;
  const inlineTokens = config.tokens;
  const resolvedConfig: Config = {
    ...config,
    tokens: inlineTokens ?? {},
  };
  const ruleRegistry = new RuleRegistry(resolvedConfig, env);
  const tokenTracker = new TokenTracker(provider);
  const tokensReady: Promise<
    Record<string, DesignTokens | readonly DtifFlattenedToken[]>
  > = ruleRegistry
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
  const linter = new Linter(resolvedConfig, {
    ruleRegistry,
    tokenTracker,
    tokensReady,
  });
  const service = new LintService(linter, resolvedConfig, env);
  linter.setService(service);
  return { linter, service };
}
