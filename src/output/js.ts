import type { DesignTokens, DtifFlattenedToken } from '../core/types.js';
import {
  getFlattenedTokens,
  toConstantName,
  type NameTransform,
} from '../utils/tokens/index.js';
import { getTokenPath } from '../utils/tokens/token-view.js';

export interface JsOutputOptions {
  /** Optional transform applied to token path segments before generating constants */
  nameTransform?: NameTransform;
}

/**
 * Generate JavaScript constant declarations for the provided tokens.
 *
 * Accepts DTIF token documents or pre-flattened DTIF token arrays. Each token
 * becomes an exported constant. For non-default themes, the theme name is
 * appended to the constant identifier.
 */
export function generateJsConstants(
  tokensByTheme: Record<string, DesignTokens | readonly DtifFlattenedToken[]>,
  options: JsOutputOptions = {},
): string {
  const { nameTransform } = options;
  const themes = Object.keys(tokensByTheme);
  const lines: string[] = [];

  for (const theme of themes) {
    const dtifTokens = getFlattenedTokens(tokensByTheme, theme, {
      nameTransform,
    });
    const entries = dtifTokens
      .map((token) => ({
        token,
        path: getTokenPath(token, nameTransform),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
    for (const { path, token } of entries) {
      const base = toConstantName(path);
      const constName =
        theme === 'default' ? base : `${base}_${theme.toUpperCase()}`;
      const value = JSON.stringify(token.value);
      lines.push(`export const ${constName} = ${value};`);
    }
  }

  return lines.join('\n');
}
