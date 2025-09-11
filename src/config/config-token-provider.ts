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
  const entries = Object.entries(val).filter(([k]) => !k.startsWith('$'));
  if (entries.length === 0) return false;
  if (entries.length === 1) {
    const [, theme] = entries[0];
    if (!isRecord(theme)) return false;
    const children = Object.entries(theme)
      .filter(([k]) => !k.startsWith('$'))
      .map(([, v]) => v);
    const allTokens = children.every(
      (child) => isRecord(child) && ('$value' in child || 'value' in child),
    );
    return !allTokens;
  }
  let shared: string[] | null = null;
  for (const [, theme] of entries) {
    if (!isRecord(theme)) return false;
    const keys = Object.keys(theme).filter((k) => !k.startsWith('$'));
    if (shared === null) {
      shared = keys;
    } else {
      shared = shared.filter((k) => keys.includes(k));
      if (shared.length === 0) return false;
    }
  }
  return true;
}
