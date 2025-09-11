import { collections } from '../../utils/index.js';

const { isArray } = collections;

export function validateCubicBezier(value: unknown, path: string): void {
  if (isArray(value) && value.length === 4) {
    for (let i = 0; i < 4; i++) {
      const v: unknown = value[i];
      if (typeof v !== 'number' || v < 0 || v > 1) {
        throw new Error(`Token ${path} has invalid cubicBezier value`);
      }
    }
    return;
  }
  throw new Error(`Token ${path} has invalid cubicBezier value`);
}
