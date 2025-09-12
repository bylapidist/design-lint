/**
 * @packageDocumentation
 *
 * Helpers for normalizing design token inputs into theme records.
 */
import type { DesignTokens } from '../../core/types.js';
import { isDesignTokens, isThemeRecord } from '../guards/domain/index.js';
import { parseTokensForTheme } from './parse-tokens-for-theme.js';

/**
 * Normalize and validate design token input.
 *
 * Accepts either a design token object or a theme record mapping theme names to
 * token sets. The tokens are parsed using {@link parseDesignTokens} and
 * returned as a consistent theme record keyed by theme name.
 *
 * @param tokens - Token input to normalize.
 * @returns A record of design tokens keyed by theme name.
 * @throws {TokenParseError} When token parsing fails.
 * @throws {Error} When token definitions are invalid.
 *
 * @example
 * ```ts
 * import { normalizeTokens } from '@lapidist/design-lint/utils';
 * const themes = normalizeTokens({
 *   light: { color: { primary: { $type: 'color', $value: '#000' } } },
 * });
 * console.log(Object.keys(themes));
 * ```
 */
export function normalizeTokens(tokens: unknown): Record<string, DesignTokens> {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }

  if (isThemeRecord(tokens)) {
    for (const [theme, t] of Object.entries(tokens)) {
      parseTokensForTheme(theme, t);
    }
    return tokens;
  }

  if (isDesignTokens(tokens)) {
    parseTokensForTheme('default', tokens);
    return { default: tokens };
  }

  return {};
}
