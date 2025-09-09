import type { VariableProvider } from '../../core/environment.js';
import type { LegacyDesignTokens } from '../../core/types.js';
import {
  normalizeTokens,
  type NormalizedTokens,
} from '../../core/token-utils.js';

export class NodeTokenProvider implements VariableProvider {
  private tokens?: LegacyDesignTokens | Record<string, LegacyDesignTokens>;
  private wrapVar: boolean;
  private normalized?: NormalizedTokens;

  constructor(
    tokens?: LegacyDesignTokens | Record<string, LegacyDesignTokens>,
    wrapTokensWithVar = false,
  ) {
    this.tokens = tokens;
    this.wrapVar = wrapTokensWithVar;
  }

  load(): Promise<NormalizedTokens> {
    this.normalized ??= normalizeTokens(this.tokens, this.wrapVar);
    return Promise.resolve(this.normalized);
  }

  getTokens(): NormalizedTokens | undefined {
    return this.normalized;
  }

  subscribe(): () => void {
    return () => undefined;
  }
}
