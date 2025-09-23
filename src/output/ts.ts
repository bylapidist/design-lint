import type { DesignTokens } from '../core/types.js';
import { TokenRegistry } from '../core/token-registry.js';
import {
  sortTokensByPath,
  toConstantName,
  type NameTransform,
} from '../utils/tokens/index.js';
import { formatTokenValue } from '../utils/tokens/format-token-value.js';

export interface TsOutputOptions {
  /** Optional transform applied to token path segments before generating declarations */
  nameTransform?: NameTransform;
  /** Optional warning callback for alias resolution or other notices */
  onWarn?: (msg: string) => void;
}

/**
 * Generate a TypeScript module exporting a typed token object for each theme.
 */
export async function generateTsDeclarations(
  tokensByTheme: Record<string, DesignTokens>,
  options: TsOutputOptions = {},
): Promise<string> {
  const { nameTransform } = options;
  const themes = Object.keys(tokensByTheme);
  const lines: string[] = ['export const tokens = {'];
  const registry = await TokenRegistry.create(tokensByTheme, {
    nameTransform,
    onWarn: options.onWarn,
  });

  for (const theme of themes) {
    lines.push(`  ${JSON.stringify(theme)}: {`);
    const flat = sortTokensByPath(registry.getTokens(theme));
    for (const t of flat) {
      const key = toConstantName(t.path);
      const value = formatTokenValue(t, { colorSpace: 'rgb' });
      lines.push(`    ${key}: ${JSON.stringify(value)},`);
    }
    lines.push('  },');
  }

  lines.push('} as const;');
  lines.push('export type Tokens = typeof tokens;');
  return lines.join('\n');
}
