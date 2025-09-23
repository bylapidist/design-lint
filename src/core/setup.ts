import { Linter, type Config } from './linter.js';
import type { Environment, TokenProvider } from './environment.js';
import { RuleRegistry } from './rule-registry.js';
import { TokenTracker } from './token-tracker.js';
import { LintService } from './lint-service.js';
import { flattenDtifDesignTokens } from '../utils/tokens/flatten.js';
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
    async load() {
      const result: Record<string, DesignTokens> = {};
      if (inlineTokens && isDesignTokens(inlineTokens)) {
        await flattenDtifDesignTokens(inlineTokens, {
          uri: 'memory://design-lint/config.tokens.json',
          onWarn,
        });
        result.default = inlineTokens;
      }
      return result;
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
