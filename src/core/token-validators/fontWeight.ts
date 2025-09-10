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

export function validateFontWeight(value: unknown, path: string): void {
  if (typeof value === 'number') {
    if (value < 1 || value > 1000) {
      throw new Error(`Token ${path} has invalid fontWeight value`);
    }
    return;
  }
  if (typeof value === 'string' && FONT_WEIGHT_KEYWORDS.has(value)) return;
  throw new Error(`Token ${path} has invalid fontWeight value`);
}
