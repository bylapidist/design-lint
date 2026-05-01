/**
 * @packageDocumentation
 *
 * Token provider for design tokens declared directly within a
 * {@link Config} object.
 */
import type { KernelConfig } from './kernel-config.js';
import type { DesignTokens } from '../core/types.js';
import { tokens } from '../utils/index.js';

const { normalizeTokens } = tokens;

/**
 * Provides design tokens declared directly in a {@link Config} object.
 *
 * The provider normalizes the `tokens` property to a consistent theme record
 * and validates each token set using the DTIF parser.
 *
 * @internal Used by the kernel daemon to seed the DSR kernel on startup and
 * by the test suite to supply inline tokens without a running kernel. Not part
 * of the public API — do not import from `@lapidist/design-lint/config`.
 */
export class ConfigTokenProvider {
  /**
   * Resolved configuration containing token definitions.
   */
  private readonly config: KernelConfig;

  /**
   * Creates a token provider from a resolved configuration.
   *
   * @param config - Parsed linter configuration.
   */
  constructor(config: KernelConfig) {
    this.config = config;
  }

  /**
   * Load and validate tokens from the configuration.
   *
   * @returns A promise that resolves to a theme record keyed by theme name.
   * @throws {DtifTokenParseError} When token parsing fails.
   * @throws {Error} When token definitions are invalid.
   */
  async load(): Promise<Record<string, DesignTokens>> {
    return normalizeTokens(this.config.tokens);
  }
}
