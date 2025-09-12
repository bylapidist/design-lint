import { Linter, type Config } from './linter.js';
import type { Environment, TokenProvider } from './environment.js';
import { RuleRegistry } from './rule-registry.js';
import { TokenTracker } from './token-tracker.js';
import { LintService } from './lint-service.js';
import { getFlattenedTokens as flattenTokens } from '../utils/tokens/index.js';
import type { DesignTokens } from './types.js';

function isDesignTokens(val: unknown): val is DesignTokens {
  return typeof val === 'object' && val !== null;
}

export function setupLinter(
  config: Config,
  env: Environment,
  onWarn?: (msg: string) => void,
): { linter: Linter; service: LintService } {
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
  const resolvedConfig: Config = {
    ...config,
    tokens: inlineTokens ?? {},
  };
  const ruleRegistry = new RuleRegistry(resolvedConfig, env);
  const tokenTracker = new TokenTracker(provider);
  const tokensReady = ruleRegistry.load().then(() => provider.load());
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
