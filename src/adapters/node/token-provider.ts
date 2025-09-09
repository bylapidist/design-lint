import type { VariableProvider } from '../../core/environment.js';
import type { DesignTokens } from '../../core/types.js';
import {
  normalizeTokens,
  type NormalizedTokens,
} from '../../core/token-utils.js';

export class NodeTokenProvider implements VariableProvider {
  private tokens?: DesignTokens | Record<string, DesignTokens>;
  private wrapVar: boolean;
  private normalized?: NormalizedTokens;

  constructor(
    tokens?: DesignTokens | Record<string, DesignTokens>,
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
