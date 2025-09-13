import { parse, formatRgb, formatHex, formatHsl } from 'culori';
import type { FlattenedToken } from '../types.js';
import { validateColor } from '../token-validators/color.js';

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

export function normalizeColorValues(
  tokens: FlattenedToken[],
  space: ColorSpace,
): void {
  for (const token of tokens) {
    if (token.type !== 'color') continue;
    validateColor(token.value, token.path);
    if (typeof token.value === 'string') {
      const parsed = parse(token.value);
      switch (space) {
        case 'hsl':
          token.value = formatHsl(parsed);
          break;
        case 'hex':
          token.value = formatHex(parsed);
          break;
        case 'rgb':
        default:
          token.value = formatRgb(parsed);
          break;
      }
      continue;
    }
    const { colorSpace, components, alpha } = token.value;
    const parsed = parse(buildColorString(colorSpace, components, alpha));
    switch (space) {
      case 'hsl':
        token.value = formatHsl(parsed);
        break;
      case 'hex':
        token.value = formatHex(parsed);
        break;
      case 'rgb':
      default:
        token.value = formatRgb(parsed);
        break;
    }
  }
}
