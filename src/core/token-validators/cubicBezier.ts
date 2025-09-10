import type { Token } from '../types.js';
import { validateAliases } from '../parser/alias.js';

export function validateCubicBezier(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (Array.isArray(value) && value.length === 4) {
    for (let i = 0; i < 4; i++) {
      const v: unknown = value[i];
      if (typeof v === 'number') {
        if (v < 0 || v > 1) {
          throw new Error(`Token ${path} has invalid cubicBezier value`);
        }
      } else if (typeof v === 'string') {
        validateAliases(v, `${path}[${String(i)}]`, 'number', tokenMap, {
          require: true,
        });
      } else {
        throw new Error(`Token ${path} has invalid cubicBezier value`);
      }
    }
    return;
  }
  if (typeof value === 'string') {
    validateAliases(value, path, 'cubicBezier', tokenMap, { require: true });
    return;
  }
  throw new Error(`Token ${path} has invalid cubicBezier value`);
}
