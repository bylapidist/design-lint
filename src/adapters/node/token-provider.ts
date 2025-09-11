import type { VariableProvider } from '../../core/environment';
import type { DesignTokens } from '../../core/types';
import type { Config } from '../../core/linter';
import { isDesignTokens } from '../../utils/is-design-tokens';
import { isThemeRecord } from '../../utils/is-theme-record';

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
