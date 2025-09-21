import type { DesignTokens } from '../core/types.js';
import {
  getFlattenedTokens,
  normalizePath,
  sortTokensByPath,
  type NameTransform,
} from '../utils/tokens/index.js';
import { JsonPointer } from 'jsonpointerx';

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
    const flat = sortTokensByPath(
      getFlattenedTokens(tokensByTheme, theme, {
        nameTransform,
        onWarn: options.onWarn,
      }),
    );
    const lines: string[] = [`${selector} {`];
    for (const t of flat) {
      const varName = pointerToCssVariable(t.path);
      lines.push(`  ${varName}: ${formatCssValue(t.value)};`);
    }
    lines.push('}');
    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}

function formatCssValue(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value);
  }
  return '';
}

function pointerToCssVariable(path: string): string {
  const pointer = normalizePath(path);
  if (pointer === '') {
    return '--';
  }
  const segments = JsonPointer.compile(pointer).segments;
  return `--${segments.join('-')}`;
}
