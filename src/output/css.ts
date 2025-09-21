import type { DesignTokens, FlattenedToken } from '../core/types.js';
import {
  getFlattenedTokens,
  sortTokensByPath,
  type NameTransform,
} from '../utils/tokens/index.js';
import { normalizeColorValues } from '../core/parser/normalize-colors.js';
import { isRecord } from '../utils/guards/data/is-record.js';

interface DimensionValue {
  dimensionType: string;
  value: number;
  unit: string;
  fontScale?: boolean;
}

interface DurationValue {
  value: number;
  unit: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toString();
}

function isDimensionValue(input: unknown): input is DimensionValue {
  if (!isRecord(input)) return false;
  const dimensionType = Reflect.get(input, 'dimensionType');
  const magnitude = Reflect.get(input, 'value');
  const unit = Reflect.get(input, 'unit');
  const fontScale = Reflect.get(input, 'fontScale');
  if (typeof dimensionType !== 'string') return false;
  if (!isFiniteNumber(magnitude)) return false;
  if (typeof unit !== 'string') return false;
  if (fontScale !== undefined && typeof fontScale !== 'boolean') {
    return false;
  }
  return true;
}

function formatDimension(value: DimensionValue): string {
  const magnitude = formatNumber(value.value);
  return `${magnitude}${value.unit}`;
}

function isDurationValue(input: unknown): input is DurationValue {
  if (!isRecord(input)) return false;
  const magnitude = Reflect.get(input, 'value');
  const unit = Reflect.get(input, 'unit');
  if (!isFiniteNumber(magnitude)) return false;
  return typeof unit === 'string';
}

function formatDuration(value: DurationValue): string {
  return `${formatNumber(value.value)}${value.unit}`;
}

function isCubicBezierValue(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => isFiniteNumber(entry))
  );
}

function formatCubicBezier(value: number[]): string {
  return `cubic-bezier(${value.map(formatNumber).join(', ')})`;
}

function serializeTokenValue(token: FlattenedToken): string {
  const { value, type } = token;
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'number') {
    return formatNumber(value);
  }
  if (type === 'dimension' && isDimensionValue(value)) {
    return formatDimension(value);
  }
  if (type === 'duration' && isDurationValue(value)) {
    return formatDuration(value);
  }
  if (type === 'cubicBezier' && isCubicBezierValue(value)) {
    return formatCubicBezier(value);
  }
  return JSON.stringify(value);
}

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
    });
    normalizeColorValues(flat, 'hex');
    const sorted = sortTokensByPath(flat);
    const lines: string[] = [`${selector} {`];
    for (const t of sorted) {
      const varName = `--${t.path.replace(/\./g, '-')}`;
      lines.push(`  ${varName}: ${serializeTokenValue(t)};`);
    }
    lines.push('}');
    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}
