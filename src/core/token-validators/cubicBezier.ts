import type { TokenValidator } from './index.js';
import { expectAlias } from './utils.js';

const validateCubicBezier: TokenValidator = (value, path, tokenMap) => {
  if (Array.isArray(value) && value.length === 4) {
    for (let i = 0; i < 4; i++) {
      const v: unknown = value[i];
      if (typeof v === 'number') {
        if (v < 0 || v > 1) {
          throw new Error(`Token ${path} has invalid cubicBezier value`);
        }
      } else if (typeof v === 'string') {
        expectAlias(v, `${path}[${String(i)}]`, 'number', tokenMap);
      } else {
        throw new Error(`Token ${path} has invalid cubicBezier value`);
      }
    }
    return;
  }
  if (typeof value === 'string') {
    expectAlias(value, path, 'cubicBezier', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid cubicBezier value`);
};

export default validateCubicBezier;
