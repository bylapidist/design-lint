/**
 * @packageDocumentation
 *
 * Token provider for design tokens declared directly within a
 * {@link Config} object.
 */
import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';
import { isLikelyDtifDesignTokens } from '../core/dtif/detect.js';
import { DTIF_MIGRATION_MESSAGE } from '../core/dtif/messages.js';
import { guards, tokens } from '../utils/index.js';

const {
  domain: { isDesignTokens, isThemeRecord },
} = guards;
const { normalizeDtifTokens, wrapTokenError } = tokens;

/**
 * Provides design tokens declared directly in a {@link Config} object.
 *
 * The provider normalizes the `tokens` property to a consistent theme record
 * and validates each token set using the DTIF parser. Non-DTIF documents are
 * rejected with a migration error.
 *
 * @example
 * ```ts
 * import { ConfigTokenProvider } from '@lapidist/design-lint/config';
 * const provider = new ConfigTokenProvider({ tokens: {} });
 * const themes = await provider.load();
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
   * @returns A promise resolving to a theme record keyed by theme name.
   * @throws {TokenParseError} When token parsing fails.
   * @throws {Error} When token definitions are invalid.
   */
  async load(): Promise<Record<string, DesignTokens>> {
    const input = this.config.tokens;
    if (!input || typeof input !== 'object') {
      return {};
    }

    if (isThemeRecord(input)) {
      for (const [theme, document] of Object.entries(input)) {
        if (theme.startsWith('$')) continue;
        if (!isDesignTokens(document) || !isLikelyDtifDesignTokens(document)) {
          throw wrapTokenError(
            theme,
            new Error(DTIF_MIGRATION_MESSAGE),
            'parse',
          );
        }
      }
      return normalizeDtifTokens(input, {
        uriForTheme: createThemeUri,
      });
    }

    if (isDesignTokens(input)) {
      if (!isLikelyDtifDesignTokens(input)) {
        throw new Error(DTIF_MIGRATION_MESSAGE);
      }
      return normalizeDtifTokens(input, {
        uri: 'memory://design-lint/config.tokens.json',
      });
    }

    return {};
  }
}

function createThemeUri(theme: string): string {
  const slug = encodeURIComponent(theme || 'default');
  return `memory://design-lint/config/${slug}.tokens.json`;
}
