import type { VariableProvider } from '../../core/environment.js';
import type { DesignTokens } from '../../core/types.js';

export class NodeTokenProvider implements VariableProvider {
  private tokens: Record<string, DesignTokens>;

  constructor(tokens?: DesignTokens | Record<string, DesignTokens>) {
    this.tokens = tokens
      ? isThemeRecord(tokens)
        ? tokens
        : { default: tokens }
      : {};
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
