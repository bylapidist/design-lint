import type { DesignTokens } from '../core/types.js';
import { TokenRegistry } from '../core/token-registry.js';
import {
  sortTokensByPath,
  toConstantName,
  type NameTransform,
} from '../utils/tokens/index.js';
import { formatTokenValue } from '../utils/tokens/format-token-value.js';

export interface JsOutputOptions {
  /** Optional transform applied to token path segments before generating constants */
  nameTransform?: NameTransform;
  /** Optional warning callback for alias resolution or other notices */
  onWarn?: (msg: string) => void;
}

/**
 * Generate JavaScript constant declarations for the provided tokens.
 *
 * Each token becomes an exported constant. For non-default themes, the theme
 * name is appended to the constant identifier.
 */
export async function generateJsConstants(
  tokensByTheme: Record<string, DesignTokens>,
  options: JsOutputOptions = {},
): Promise<string> {
  const { nameTransform } = options;
  const themes = Object.keys(tokensByTheme);
  const lines: string[] = [];
  const registry = await TokenRegistry.create(tokensByTheme, {
    nameTransform,
    onWarn: options.onWarn,
  });

  for (const theme of themes) {
    const flat = sortTokensByPath(registry.getTokens(theme));
    for (const t of flat) {
      const base = toConstantName(t.path);
      const constName =
        theme === 'default' ? base : `${base}_${theme.toUpperCase()}`;
      const value = formatTokenValue(t, { colorSpace: 'rgb' });
      lines.push(`export const ${constName} = ${JSON.stringify(value)};`);
    }
  }

  return lines.join('\n');
}
