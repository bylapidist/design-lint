import type { DesignTokens, DtifFlattenedToken } from '../core/types.js';
import {
  getFlattenedTokens,
  sortTokensByPath,
  toConstantName,
  type NameTransform,
} from '../utils/tokens/index.js';

export interface TsOutputOptions {
  /** Optional transform applied to token path segments before generating declarations */
  nameTransform?: NameTransform;
  /** Optional warning callback for alias resolution or other notices */
  onWarn?: (msg: string) => void;
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
    const flat = sortTokensByPath(
      getFlattenedTokens(tokensByTheme, theme, {
        nameTransform,
        onWarn: options.onWarn,
      }),
    );
    for (const t of flat) {
      const key = toConstantName(t.path);
      const value = JSON.stringify(t.value);
      lines.push(`    ${key}: ${value},`);
    }
    lines.push('  },');
  }

  lines.push('} as const;');
  lines.push('export type Tokens = typeof tokens;');
  return lines.join('\n');
}
