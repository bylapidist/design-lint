import type { TokenValidator } from './index.js';
import { isRecord, expectAlias } from './utils.js';
import validateColor from './color.js';

const validateGradient: TokenValidator = (value, path, tokenMap) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Token ${path} has invalid gradient value`);
  }
  const stops = value;
  for (let i = 0; i < stops.length; i++) {
    const stop: unknown = stops[i];
    if (!isRecord(stop)) {
      throw new Error(`Token ${path} has invalid gradient value`);
    }
    const allowed = new Set(['color', 'position']);
    for (const key of Object.keys(stop)) {
      if (!allowed.has(key)) {
        throw new Error(`Token ${path} has invalid gradient value`);
      }
    }
    validateColor(stop.color, `${path}[${String(i)}].color`, tokenMap);
    const pos = stop.position;
    if (typeof pos === 'number') {
      // allow any number; clamping is handled by consumers
    } else if (typeof pos === 'string') {
      expectAlias(pos, `${path}[${String(i)}].position`, 'number', tokenMap);
    } else {
      throw new Error(`Token ${path} has invalid gradient value`);
    }
  }
};

export default validateGradient;
