import type { DesignTokens } from '../core/types.js';
import { getFlattenedTokens, type NameTransform } from '../core/token-utils.js';

export interface JsOutputOptions {
  /** Optional transform applied to token path segments before generating constants */
  nameTransform?: NameTransform;
}

/**
 * Generate JavaScript constant declarations for the provided tokens.
 *
 * Each token becomes an exported constant. For non-default themes, the theme
 * name is appended to the constant identifier.
 */
export function generateJsConstants(
  tokensByTheme: Record<string, DesignTokens>,
  options: JsOutputOptions = {},
): string {
  const { nameTransform } = options;
  const themes = Object.keys(tokensByTheme);
  const lines: string[] = [];

  for (const theme of themes) {
    const flat = getFlattenedTokens(tokensByTheme, theme, {
      nameTransform,
    }).sort((a, b) => a.path.localeCompare(b.path));
    for (const t of flat) {
      const base = t.path.replace(/\./g, '_').replace(/-/g, '_').toUpperCase();
      const constName =
        theme === 'default' ? base : `${base}_${theme.toUpperCase()}`;
      const value = JSON.stringify(t.value);
      lines.push(`export const ${constName} = ${value};`);
    }
  }

  return lines.join('\n');
}
