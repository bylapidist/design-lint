import { collections, guards } from '../../utils/index.js';
import { validateColor } from './color.js';

const { isArray } = collections;
const {
  data: { isRecord },
} = guards;

export function validateGradient(value: unknown, path: string): void {
  if (!isArray(value) || value.length < 2) {
    throw new Error(`Token ${path} has invalid gradient value`);
  }
  for (let i = 0; i < value.length; i++) {
    const stop = value[i];
    if (!isRecord(stop)) {
      throw new Error(`Token ${path} has invalid gradient value`);
    }
    const allowed = new Set(['color', 'position']);
    for (const key of Object.keys(stop)) {
      if (!allowed.has(key)) {
        throw new Error(`Token ${path} has invalid gradient value`);
      }
    }
    validateColor(stop.color, `${path}[${String(i)}].color`);
    const pos = stop.position;
    if (typeof pos !== 'number' || !Number.isFinite(pos)) {
      throw new Error(`Token ${path} has invalid gradient value`);
    }
    if (pos < 0) {
      stop.position = 0;
    } else if (pos > 1) {
      stop.position = 1;
    }
  }
}
