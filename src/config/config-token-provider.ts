import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';
import { parseDesignTokens } from '../core/parser/index.js';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDesignTokens(value: unknown): value is DesignTokens {
  return isRecord(value);
}

function isThemeRecord(val: unknown): val is Record<string, DesignTokens> {
  if (!isRecord(val)) return false;
  return Object.values(val).every(
    (v) => isDesignTokens(v) && !('$value' in v) && !('value' in v),
  );
}
