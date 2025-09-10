import type { Token } from '../types.js';
import { validateAliases } from '../parser/alias.js';

const FONT_WEIGHT_KEYWORDS = new Set([
  'thin',
  'hairline',
  'extra-light',
  'ultra-light',
  'light',
  'normal',
  'regular',
  'book',
  'medium',
  'semi-bold',
  'demi-bold',
  'bold',
  'extra-bold',
  'ultra-bold',
  'black',
  'heavy',
  'extra-black',
  'ultra-black',
]);

export function validateFontWeight(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'number') {
    if (value < 1 || value > 1000) {
      throw new Error(`Token ${path} has invalid fontWeight value`);
    }
    return;
  }
  if (typeof value === 'string') {
    if (validateAliases(value, path, 'fontWeight', tokenMap).length) return;
    if (FONT_WEIGHT_KEYWORDS.has(value)) return;
  }
  throw new Error(`Token ${path} has invalid fontWeight value`);
}
