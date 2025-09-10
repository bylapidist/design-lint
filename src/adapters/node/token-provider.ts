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
  return Object.entries(val).every(([themeName, theme]) => {
    if (themeName.startsWith('$')) return true;
    if (!isDesignTokens(theme)) return false;
    return Object.entries(theme).every(
      ([key, child]) =>
        key.startsWith('$') || (isRecord(child) && !('$value' in child)),
    );
  });
}
