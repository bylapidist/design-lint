/**
 * Parse a token definition for a specific theme, wrapping unknown errors with
 * theme context.
 *
 * @param theme - Theme name associated with the tokens.
 * @param tokens - Token definition to parse.
 * @throws {DtifTokenParseError} When DTIF validation fails.
 * @throws {Error} When token definitions are invalid.
 */
import type { DesignTokens } from '../../core/types.js';
import { DtifTokenParseError } from '../../adapters/node/token-parser.js';
import { parseDtifTokenObject } from '../../core/dtif/parse.js';
import { wrapTokenError } from './wrap-token-error.js';

export interface ParseTokensForThemeResult {
  flattened?: readonly import('../../core/types.js').DtifFlattenedToken[];
}

export async function parseTokensForTheme(
  theme: string,
  tokens: DesignTokens,
): Promise<ParseTokensForThemeResult> {
  try {
    const result = await parseDtifTokenObject(tokens, {
      uri: `memory://inline-tokens/${encodeURIComponent(theme)}.json`,
    });
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) {
      throw new DtifTokenParseError(
        `inline tokens for theme "${theme}"`,
        errors,
      );
    }
    return { flattened: result.tokens };
  } catch (err) {
    if (err instanceof DtifTokenParseError) {
      throw err;
    }
    throw wrapTokenError(theme, err, 'parse');
  }
}
