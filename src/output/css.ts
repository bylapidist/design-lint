import type { DesignTokens } from '../core/types.js';
import { TokenRegistry } from '../core/token-registry.js';
import { sortTokensByPath, type NameTransform } from '../utils/tokens/index.js';
import { formatTokenValue } from '../utils/tokens/format-token-value.js';

export interface CssOutputOptions {
  /** Optional transform applied to token path segments before generating vars */
  nameTransform?: NameTransform;
  /** Mapping of theme names to CSS selectors. Defaults to :root and [data-theme="theme"]. */
  selectors?: Record<string, string>;
  /** Optional warning callback for alias resolution or other notices */
  onWarn?: (msg: string) => void;
}

/**
 * Generate CSS custom property declarations for the provided tokens.
 *
 * Each theme becomes a selector block. The default theme uses `:root` and
 * variants default to `[data-theme='name']` unless overridden via `selectors`.
 */
export async function generateCssVariables(
  tokensByTheme: Record<string, DesignTokens>,
  options: CssOutputOptions = {},
): Promise<string> {
  const { nameTransform, selectors } = options;
  const themes = Object.keys(tokensByTheme).sort((a, b) => {
    if (a === 'default') return -1;
    if (b === 'default') return 1;
    return a.localeCompare(b);
  });
  const blocks: string[] = [];
  const registry = await TokenRegistry.create(tokensByTheme, {
    nameTransform,
    onWarn: options.onWarn,
  });

  for (const theme of themes) {
    const selector =
      selectors?.[theme] ??
      (theme === 'default' ? ':root' : `[data-theme='${theme}']`);
    const flat = sortTokensByPath(registry.getTokens(theme));
    const lines: string[] = [`${selector} {`];
    for (const t of flat) {
      const varName = `--${t.path.replace(/\./g, '-')}`;
      const value = formatTokenValue(t, { colorSpace: 'rgb' });
      lines.push(`  ${varName}: ${value};`);
    }
    lines.push('}');
    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}
