import type { DesignTokens, DtifFlattenedToken } from '../core/types.js';
import {
  getFlattenedTokens,
  sortTokensByPath,
  toConstantName,
  type NameTransform,
} from '../utils/tokens/index.js';

export interface JsOutputOptions {
  /** Optional transform applied to token path segments before generating constants */
  nameTransform?: NameTransform;
  /** Optional warning callback for alias resolution or other notices */
  onWarn?: (msg: string) => void;
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
    const flat = sortTokensByPath(
      getFlattenedTokens(tokensByTheme, theme, {
        nameTransform,
        onWarn: options.onWarn,
      }),
    );
    for (const t of flat) {
      const base = toConstantName(t.path);
      const constName =
        theme === 'default' ? base : `${base}_${theme.toUpperCase()}`;
      const value = JSON.stringify(t.value);
      lines.push(`export const ${constName} = ${value};`);
    }
  }

  return lines.join('\n');
}
