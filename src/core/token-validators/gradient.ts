import type { Token } from '../types.js';
import { expectAlias } from '../parser/normalize.js';
import { isArray, isRecord } from './utils.js';
import { validateColor } from './color.js';

export function validateGradient(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (!isArray(value) || value.length === 0) {
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
}
