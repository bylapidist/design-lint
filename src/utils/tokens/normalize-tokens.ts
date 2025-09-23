/**
 * @packageDocumentation
 *
 * Helpers for normalizing design token inputs into theme records.
 */
import type { DesignTokens } from '../../core/types.js';
import { isDesignTokens, isThemeRecord } from '../guards/domain/index.js';
import { attachDtifFlattenedTokens } from './dtif-cache.js';
import {
  parseTokensForTheme,
  type ParseTokensForThemeResult,
} from './parse-tokens-for-theme.js';

/**
 * Normalize and validate design token input.
 *
 * Accepts either a design token object or a theme record mapping theme names to
 * token sets. The tokens are parsed using the DTIF parser and returned as a
 * consistent theme record keyed by theme name.
 *
 * @param tokens - Token input to normalize.
 * @returns A promise resolving to a record of design tokens keyed by theme name.
 * @throws {DtifTokenParseError} When token parsing fails.
 * @throws {Error} When token definitions are invalid.
 *
 * @example
 * ```ts
 * import { normalizeTokens } from '@lapidist/design-lint/utils';
 * const themes = await normalizeTokens({
 *   light: { color: { primary: { $type: 'color', $value: '#000' } } },
 * });
 * console.log(Object.keys(themes));
 * ```
 */
export async function normalizeTokens(
  tokens: unknown,
): Promise<Record<string, DesignTokens>> {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }

  if (isThemeRecord(tokens)) {
    for (const [theme, t] of Object.entries(tokens)) {
      if (theme.startsWith('$')) continue;
      const result = await parseTokensForTheme(theme, t);
      attachFlattenedTokens(t, result);
    }
    return tokens;
  }

  if (isDesignTokens(tokens)) {
    const result = await parseTokensForTheme('default', tokens);
    attachFlattenedTokens(tokens, result);
    return { default: tokens };
  }

  throw new Error(
    'Invalid design token input: expected DTIF token documents or theme records',
  );
}

function attachFlattenedTokens(
  target: DesignTokens,
  result: ParseTokensForThemeResult,
): void {
  if (result.flattened) {
    attachDtifFlattenedTokens(target, result.flattened);
  }
}
