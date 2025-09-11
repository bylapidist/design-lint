import colorName from 'color-name';

export type ColorFormat =
  | 'hex'
  | 'rgb'
  | 'rgba'
  | 'hsl'
  | 'hsla'
  | 'hwb'
  | 'lab'
  | 'lch'
  | 'color'
  | 'named';

/**
 * Set of CSS color names supported by the `color-name` package.
 */
export const namedColors = new Set(Object.keys(colorName));

/**
 * Detects the format of a CSS color string.
 *
 * @param value - The color string to examine.
 * @returns The detected color format or `null` if unknown.
 */
export const detectColorFormat = (value: string): ColorFormat | null => {
  const v = value.toLowerCase();
  if (v.startsWith('#')) return 'hex';
  if (v.startsWith('rgba(')) return 'rgba';
  if (v.startsWith('rgb(')) return 'rgb';
  if (v.startsWith('hsla(')) return 'hsla';
  if (v.startsWith('hsl(')) return 'hsl';
  if (v.startsWith('hwb(')) return 'hwb';
  if (v.startsWith('lab(')) return 'lab';
  if (v.startsWith('lch(')) return 'lch';
  if (v.startsWith('color(')) return 'color';
  if (namedColors.has(v)) return 'named';
  return null;
};
