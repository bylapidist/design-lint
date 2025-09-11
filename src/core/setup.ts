import { Linter, type Config } from './linter';
import type { Environment, TokenProvider } from './environment';
import { RuleRegistry } from './rule-registry';
import { TokenTracker } from './token-tracker';
import { LintService } from './lint-service';
import { getFlattenedTokens as flattenTokens } from './token-utils';
import type { DesignTokens } from './types';

function isDesignTokens(val: unknown): val is DesignTokens {
  return typeof val === 'object' && val !== null;
}

export function setupLinter(
  config: Config,
  env: Environment,
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
  const linter = new Linter(resolvedConfig, {
    ruleRegistry,
    tokenTracker,
    tokensReady,
  });
  const service = new LintService(linter, resolvedConfig, env);
  linter.setService(service);
  return { linter, service };
}
