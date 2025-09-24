import type { VariableProvider } from '../../core/environment.js';
import type { DesignTokens } from '../../core/types.js';
import type { Config } from '../../core/linter.js';
import { guards } from '../../utils/index.js';
import { ensureDtifFlattenedTokens } from '../../utils/tokens/dtif-cache.js';

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

  async load(): Promise<Record<string, DesignTokens>> {
    const entries = Object.entries(this.tokens);
    await Promise.all(
      entries.map(([theme, tokens]) =>
        ensureDtifFlattenedTokens(tokens, {
          uri: `memory://node-token-provider/${theme}.json`,
        }),
      ),
    );
    return this.tokens;
  }

  getTokens(): Record<string, DesignTokens> | undefined {
    return this.tokens;
  }

  subscribe(): () => void {
    return () => undefined;
  }
}
