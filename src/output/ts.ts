import type { DesignTokens, DtifFlattenedToken } from '../core/types.js';
import {
  getFlattenedTokens,
  toConstantName,
  type NameTransform,
} from '../utils/tokens/index.js';
import { getTokenPath } from '../utils/tokens/token-view.js';

export interface TsOutputOptions {
  /** Optional transform applied to token path segments before generating declarations */
  nameTransform?: NameTransform;
}

/**
 * Generate a TypeScript module exporting a typed token object for each theme.
 *
 * Accepts DTIF token documents or arrays of pre-flattened DTIF tokens gathered
 * from the canonical parser.
 */
export function generateTsDeclarations(
  tokensByTheme: Record<string, DesignTokens | readonly DtifFlattenedToken[]>,
  options: TsOutputOptions = {},
): string {
  const { nameTransform } = options;
  const themes = Object.keys(tokensByTheme);
  const lines: string[] = ['export const tokens = {'];

  for (const theme of themes) {
    lines.push(`  ${JSON.stringify(theme)}: {`);
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
      const key = toConstantName(path);
      const value = JSON.stringify(token.value);
      lines.push(`    ${key}: ${value},`);
    }
    lines.push('  },');
  }

  lines.push('} as const;');
  lines.push('export type Tokens = typeof tokens;');
  return lines.join('\n');
}
