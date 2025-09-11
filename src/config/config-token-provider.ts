import type { Config } from '../core/linter';
import { parseDesignTokens } from '../core/parser/index';
import { isDesignTokens } from '../utils/is-design-tokens';
import { isThemeRecord } from '../utils/is-theme-record';

export class ConfigTokenProvider {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  load() {
    const tokens = this.config.tokens;
    if (!tokens || typeof tokens !== 'object') {
      return Promise.resolve({});
    }
    if (isThemeRecord(tokens)) {
      for (const t of Object.values(tokens)) {
        parseDesignTokens(t);
      }
      return Promise.resolve(tokens);
    }
    if (isDesignTokens(tokens)) {
      parseDesignTokens(tokens);
      return Promise.resolve({ default: tokens });
    }
    return Promise.resolve({});
  }
}
