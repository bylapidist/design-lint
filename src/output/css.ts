import type { DesignTokens } from '../core/types.js';
import {
  getFlattenedTokens,
  type NameTransform,
} from '../utils/tokens/index.js';

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
export function generateCssVariables(
  tokensByTheme: Record<string, DesignTokens>,
  options: CssOutputOptions = {},
): string {
  const { nameTransform, selectors } = options;
  const themes = Object.keys(tokensByTheme).sort((a, b) => {
    if (a === 'default') return -1;
    if (b === 'default') return 1;
    return a.localeCompare(b);
  });
  const blocks: string[] = [];

  for (const theme of themes) {
    const selector =
      selectors?.[theme] ??
      (theme === 'default' ? ':root' : `[data-theme='${theme}']`);
    const flat = getFlattenedTokens(tokensByTheme, theme, {
      nameTransform,
      onWarn: options.onWarn,
    }).sort((a, b) => a.path.localeCompare(b.path));
    const lines: string[] = [`${selector} {`];
    for (const t of flat) {
      const varName = `--${t.path.replace(/\./g, '-')}`;
      lines.push(`  ${varName}: ${String(t.value)};`);
    }
    lines.push('}');
    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}
