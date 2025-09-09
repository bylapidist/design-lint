import type { Config } from '../core/linter.js';
import type { TokenProvider } from '../core/environment.js';
import { normalizeTokens } from '../core/token-utils.js';

export class ConfigTokenProvider implements TokenProvider {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  load() {
    return Promise.resolve(
      normalizeTokens(this.config.tokens, this.config.wrapTokensWithVar),
    );
  }
}
