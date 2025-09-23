import type { FlattenedToken } from '../../core/types.js';
import {
  normalizeColorValues,
  type ColorSpace,
} from '../../core/parser/normalize-colors.js';

export interface FormatTokenValueOptions {
  /** Desired color output space when formatting DTIF color objects. */
  colorSpace?: ColorSpace;
}

const DEFAULT_COLOR_SPACE: ColorSpace = 'rgb';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValueWithUnit(
  value: unknown,
): value is { value: number; unit: string } {
  if (!isRecord(value)) return false;
  return (
    typeof Reflect.get(value, 'value') === 'number' &&
    typeof Reflect.get(value, 'unit') === 'string'
  );
}

function isColorObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  if (typeof Reflect.get(value, 'colorSpace') !== 'string') return false;
  return Reflect.has(value, 'components');
}

function formatColor(
  token: FlattenedToken,
  value: Record<string, unknown>,
  colorSpace: FormatTokenValueOptions['colorSpace'],
): string {
  const clone: FlattenedToken = {
    path: token.path,
    value: structuredClone(value),
    type: 'color',
    aliases: token.aliases,
    metadata: {
      ...token.metadata,
      loc: token.metadata.loc,
    },
  };

  const targetSpace = colorSpace ?? DEFAULT_COLOR_SPACE;
  normalizeColorValues([clone], targetSpace);
  const formatted = clone.value;
  return typeof formatted === 'string' ? formatted : JSON.stringify(formatted);
}

/**
 * Convert a flattened token value into a string suitable for serialized outputs.
 */
export function formatTokenValue(
  token: FlattenedToken,
  options: FormatTokenValueOptions = {},
): string {
  const { value } = token;
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (isValueWithUnit(value)) {
    return `${String(value.value)}${value.unit}`;
  }

  if (token.type === 'color' && isColorObject(value)) {
    try {
      return formatColor(token, value, options.colorSpace);
    } catch {
      return JSON.stringify(value);
    }
  }

  return JSON.stringify(value);
}
