import { parse, formatRgb, formatHex, formatHsl } from 'culori';
import type { FlattenedToken } from '../types.js';
import { validateColor } from '../token-validators/color.js';
import { describeTokenValueLocation, mapTokenValues } from './token-values.js';

export type ColorSpace = 'rgb' | 'hsl' | 'hex';

function buildColorString(
  colorSpace: string,
  components: (number | 'none')[],
  alpha?: number,
): string {
  const alphaString = typeof alpha === 'number' ? ` / ${String(alpha)}` : '';
  const parts = components.map((c, i) => {
    if (c === 'none') return 'none';
    switch (colorSpace) {
      case 'hsl':
      case 'hwb':
        return i === 0 ? String(c) : `${String(c)}%`;
      case 'lab':
      case 'lch':
      case 'oklab':
      case 'oklch':
        return i === 0 ? `${String(c)}%` : String(c);
      default:
        return String(c);
    }
  });

  switch (colorSpace) {
    case 'hsl':
      return `hsl(${parts.join(' ')}${alphaString})`;
    case 'hwb':
      return `hwb(${parts.join(' ')}${alphaString})`;
    case 'lab':
      return `lab(${parts.join(' ')}${alphaString})`;
    case 'lch':
      return `lch(${parts.join(' ')}${alphaString})`;
    case 'oklab':
      return `oklab(${parts.join(' ')}${alphaString})`;
    case 'oklch':
      return `oklch(${parts.join(' ')}${alphaString})`;
    default:
      return `color(${colorSpace} ${parts.join(' ')}${alphaString})`;
  }
}

function normalizeColorEntry(
  value: unknown,
  token: FlattenedToken,
  index: number,
  space: ColorSpace,
): string | undefined {
  const location = describeTokenValueLocation(token, index);
  validateColor(value, location);
  if (typeof value === 'string') {
    const parsed = parse(value);
    switch (space) {
      case 'hsl':
        return formatHsl(parsed);
      case 'hex':
        return formatHex(parsed);
      case 'rgb':
      default:
        return formatRgb(parsed);
    }
  }
  const { colorSpace, components, alpha } = value;
  const parsed = parse(buildColorString(colorSpace, components, alpha));
  switch (space) {
    case 'hsl':
      return formatHsl(parsed);
    case 'hex':
      return formatHex(parsed);
    case 'rgb':
    default:
      return formatRgb(parsed);
  }
}

export function normalizeColorValues(
  tokens: FlattenedToken[],
  space: ColorSpace,
): void {
  for (const token of tokens) {
    if (token.type !== 'color') continue;
    mapTokenValues(token, (value, index) =>
      normalizeColorEntry(value, token, index, space),
    );
  }
}
