/**
 * Parse a token definition for a specific theme, wrapping unknown errors with
 * theme context.
 *
 * @param theme - Theme name associated with the tokens.
 * @param tokens - Token definition to parse.
 * @throws {TokenParseError} When token parsing fails.
 * @throws {Error} When token definitions are invalid.
 */
import type { DesignTokens } from '../../core/types.js';
import { TokenParseError } from '../../adapters/node/token-parser.js';
import { parseDesignTokens } from '../../core/parser/index.js';
import { wrapTokenError } from './wrap-token-error.js';
import {
  createDtifValidator,
  DTIF_VALIDATION_MESSAGE,
  formatDtifErrors,
} from '../dtif/validator.js';

const dtifValidator = createDtifValidator();

export function parseTokensForTheme(theme: string, tokens: DesignTokens): void {
  try {
    if (!dtifValidator.validate(tokens)) {
      const detail = formatDtifErrors(dtifValidator.validate.errors);
      const message =
        detail === DTIF_VALIDATION_MESSAGE
          ? DTIF_VALIDATION_MESSAGE
          : `DTIF validation failed:\n${detail}`;
      throw new Error(message);
    }
    parseDesignTokens(tokens);
  } catch (err) {
    if (err instanceof TokenParseError) throw err;
    throw wrapTokenError(theme, err, 'parse');
  }
}
