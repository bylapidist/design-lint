import type { VariableProvider } from '../../core/environment.js';
import type { DesignTokens } from '../../core/types.js';
import type { Config } from '../../core/linter.js';

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
