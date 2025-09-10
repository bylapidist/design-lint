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
  return Object.values(val).every((v) => {
    if (!v || typeof v !== 'object') {
      return false;
    }
    // Treat `v` as a theme only when its immediate children do not look like
    // tokens (i.e. none expose a `$value` property). This allows single-theme
    // token objects such as `{ color: { primary: { $value: '#fff' } } }` to be
    // wrapped in a default theme while still accepting explicit theme maps.
    return !Object.values(v as Record<string, unknown>).some(
      (child) =>
        child &&
        typeof child === 'object' &&
        '$value' in (child as Record<string, unknown>),
    );
  });
}
