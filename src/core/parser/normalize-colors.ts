import { parse, formatRgb, formatHex, formatHsl } from 'culori';
import type { FlattenedToken } from '../types.js';

export type ColorSpace = 'rgb' | 'hsl' | 'hex';

export function normalizeColorValues(
  tokens: FlattenedToken[],
  space: ColorSpace,
): void {
  for (const token of tokens) {
    if (token.type !== 'color') continue;
    if (typeof token.value !== 'string') {
      throw new Error(`Token ${token.path} has invalid color value`);
    }
    const color = parse(token.value);
    if (!color || (color.mode !== 'rgb' && color.mode !== 'hsl')) {
      throw new Error(`Token ${token.path} has invalid color value`);
    }
    switch (space) {
      case 'hsl':
        token.value = formatHsl(color);
        break;
      case 'hex':
        token.value = formatHex(color);
        break;
      case 'rgb':
      default:
        token.value = formatRgb(color);
        break;
    }
  }
}
