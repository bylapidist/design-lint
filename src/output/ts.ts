import type { DesignTokens } from '../core/types.js';
import { getFlattenedTokens, type NameTransform } from '../core/token-utils.js';

export interface TsOutputOptions {
  /** Optional transform applied to token path segments before generating declarations */
  nameTransform?: NameTransform;
}

/**
 * Generate a TypeScript module exporting a typed token object for each theme.
 */
export function generateTsDeclarations(
  tokensByTheme: Record<string, DesignTokens>,
  options: TsOutputOptions = {},
): string {
  const { nameTransform } = options;
  const themes = Object.keys(tokensByTheme);
  const lines: string[] = ['export const tokens = {'];

  for (const theme of themes) {
    lines.push(`  ${JSON.stringify(theme)}: {`);
    const flat = getFlattenedTokens(tokensByTheme, theme, {
      nameTransform,
    }).sort((a, b) => a.path.localeCompare(b.path));
    for (const t of flat) {
      const key = t.path.replace(/\./g, '_').replace(/-/g, '_').toUpperCase();
      const value = JSON.stringify(t.value);
      lines.push(`    ${key}: ${value},`);
    }
    lines.push('  },');
  }

  lines.push('} as const;');
  lines.push('export type Tokens = typeof tokens;');
  return lines.join('\n');
}
