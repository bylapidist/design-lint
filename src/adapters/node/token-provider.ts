import type { VariableProvider } from '../../core/environment.js';
import type { DesignTokens } from '../../core/types.js';
import type { Config } from '../../core/linter.js';
import { isDesignTokens } from '../../utils/is-design-tokens.js';
import { isThemeRecord } from '../../utils/is-theme-record.js';

export class NodeTokenProvider implements VariableProvider {
  private tokens: Record<string, DesignTokens>;

  constructor(tokens?: Config['tokens']) {
    if (tokens && isThemeRecord(tokens)) {
      this.tokens = tokens;
    } else if (tokens && isDesignTokens(tokens)) {
      this.tokens = { default: tokens };
    } else {
      this.tokens = {};
    }
  }

  load(): Promise<Record<string, DesignTokens>> {
    return Promise.resolve(this.tokens);
  }

  getTokens(): Record<string, DesignTokens> | undefined {
    return this.tokens;
  }

  subscribe(): () => void {
    return () => undefined;
  }
}
