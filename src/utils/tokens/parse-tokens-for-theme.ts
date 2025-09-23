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
import {
  DtifDesignTokenError,
  parseDtifDesignTokensObject,
} from '../../core/parser/index.js';
import { isLikelyDtifDesignTokens } from '../../core/dtif/detect.js';
import { DTIF_MIGRATION_MESSAGE } from '../../core/dtif/messages.js';
import { wrapTokenError } from './wrap-token-error.js';

function toThemeUri(theme: string): string {
  const slug = encodeURIComponent(theme || 'default');
  return `memory://design-lint/${slug}.tokens.json`;
}

function stringifyDesignTokens(tokens: DesignTokens): string | undefined {
  try {
    return JSON.stringify(tokens, null, 2);
  } catch {
    return undefined;
  }
}

export async function parseTokensForTheme(
  theme: string,
  tokens: DesignTokens,
): Promise<void> {
  const uri = toThemeUri(theme);

  if (!isLikelyDtifDesignTokens(tokens)) {
    throw wrapTokenError(theme, new Error(DTIF_MIGRATION_MESSAGE), 'parse');
  }

  try {
    await parseDtifDesignTokensObject(tokens, { uri });
  } catch (err) {
    if (err instanceof TokenParseError) throw err;
    if (err instanceof DtifDesignTokenError && err.diagnostics.length > 0) {
      const [diagnostic] = err.diagnostics;
      throw TokenParseError.fromDtifDiagnostic(diagnostic, {
        filePath: diagnostic.location?.uri ?? uri,
        source: stringifyDesignTokens(tokens),
      });
    }
    throw wrapTokenError(theme, err, 'parse');
  }
}
