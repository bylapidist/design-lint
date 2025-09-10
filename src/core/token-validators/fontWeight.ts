import type { TokenValidator } from './index.js';
import { ALIAS_PATTERN, expectAlias } from './utils.js';

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

const validateFontWeight: TokenValidator = (value, path, tokenMap) => {
  if (typeof value === 'number') {
    if (value < 1 || value > 1000) {
      throw new Error(`Token ${path} has invalid fontWeight value`);
    }
    return;
  }
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    if (m) {
      expectAlias(value, path, 'fontWeight', tokenMap);
      return;
    }
    if (FONT_WEIGHT_KEYWORDS.has(value)) return;
  }
  throw new Error(`Token ${path} has invalid fontWeight value`);
};

export default validateFontWeight;
