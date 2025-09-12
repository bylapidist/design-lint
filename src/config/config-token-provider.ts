/**
 * @packageDocumentation
 *
 * Token provider for design tokens declared directly within a
 * {@link Config} object.
 */
import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';
import { tokens } from '../utils/index.js';

const { normalizeTokens } = tokens;

/**
 * Provides design tokens declared directly in a {@link Config} object.
 *
 * The provider normalizes the `tokens` property to a consistent theme record
 * and validates each token set using {@link parseDesignTokens}.
 *
 * @example
 * ```ts
 * import { ConfigTokenProvider } from '@lapidist/design-lint/config';
 * const provider = new ConfigTokenProvider({ tokens: {} });
 * const themes = provider.load();
 * ```
 */
export class ConfigTokenProvider {
  /**
   * Resolved configuration containing token definitions.
   */
  private readonly config: Config;

  /**
   * Creates a token provider from a resolved configuration.
   *
   * @param config - Parsed linter configuration.
   */
  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Load and validate tokens from the configuration.
   *
   * @returns A theme record keyed by theme name.
   * @throws {TokenParseError} When token parsing fails.
   * @throws {Error} When token definitions are invalid.
   */
  load(): Record<string, DesignTokens> {
    return normalizeTokens(this.config.tokens);
  }
}
