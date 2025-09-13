import { parse, formatRgb, formatHex, formatHsl } from 'culori';
import type { FlattenedToken } from '../types.js';
import { validateColor } from '../token-validators/color.js';

export type ColorSpace = 'rgb' | 'hsl' | 'hex';

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
    const compString = Object.values(components).join(' ');
    const alphaString = typeof alpha === 'number' ? ` / ${String(alpha)}` : '';
    const parsed = parse(`color(${colorSpace} ${compString}${alphaString})`);
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
