import type { VariableProvider } from '../../core/environment.js';
import type { DesignTokens } from '../../core/types.js';
import type { Config } from '../../core/linter.js';
import { guards } from '../../utils/index.js';

const {
  domain: { isDesignTokens, isThemeRecord },
} = guards;

export class NodeTokenProvider implements VariableProvider {
  private tokens: Record<string, DesignTokens>;

  constructor(tokens?: Config['tokens']) {
    if (tokens) {
      if (isThemeRecord(tokens)) {
        this.tokens = tokens;
      } else if (isDesignTokens(tokens)) {
        this.tokens = { default: tokens };
      } else {
        this.tokens = {};
      }
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
