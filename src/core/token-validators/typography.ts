import { guards } from '../../utils/index.js';
import { validateFontFamily } from './fontFamily.js';
import { validateDimension } from './dimension.js';
import { validateFontWeight } from './fontWeight.js';
import { validateNumber } from './number.js';

const { isRecord } = guards.data;

export function validateTypography(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new Error(`Token ${path} has invalid typography value`);
  }
  const allowed = new Set([
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`Token ${path} has invalid typography value`);
    }
  }
  const { fontFamily, fontSize, fontWeight, lineHeight } = value;
  if (
    fontFamily === undefined ||
    fontSize === undefined ||
    fontWeight === undefined ||
    lineHeight === undefined
  ) {
    throw new Error(`Token ${path} has invalid typography value`);
  }
  validateFontFamily(fontFamily, `${path}.fontFamily`);
  validateDimension(fontSize, `${path}.fontSize`);
  validateFontWeight(fontWeight, `${path}.fontWeight`);
  validateNumber(lineHeight, `${path}.lineHeight`);
}
