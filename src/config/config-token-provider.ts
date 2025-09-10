import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';
import { parseDesignTokens } from '../core/token-parser.js';

export class ConfigTokenProvider {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  load() {
    const tokens = this.config.tokens as
      | DesignTokens
      | Record<string, DesignTokens>
      | undefined;
    if (!tokens) return Promise.resolve({});
    if (isThemeRecord(tokens)) {
      for (const t of Object.values(tokens)) {
        parseDesignTokens(t);
      }
      return Promise.resolve(tokens);
    }
    parseDesignTokens(tokens);
    return Promise.resolve({ default: tokens });
  }
}

function isThemeRecord(
  val: DesignTokens | Record<string, DesignTokens>,
): val is Record<string, DesignTokens> {
  return Object.values(val).every(
    (v) =>
      v &&
      typeof v === 'object' &&
      !('$value' in (v as Record<string, unknown>)),
  );
}
