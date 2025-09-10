import type { Token } from '../types.js';
import { isRecord, toArray } from './utils.js';
import { validateColor } from './color.js';
import { validateDimension } from './dimension.js';

export function validateShadow(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  const items = toArray(value);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!isRecord(item)) {
      throw new Error(`Token ${path} has invalid shadow value`);
    }
    const allowed = new Set([
      'color',
      'offsetX',
      'offsetY',
      'blur',
      'spread',
      'inset',
    ]);
    for (const key of Object.keys(item)) {
      if (!allowed.has(key)) {
        throw new Error(`Token ${path} has invalid shadow value`);
      }
    }
    const base = `${path}[${String(i)}]`;
    validateColor(item.color, `${base}.color`, tokenMap);
    validateDimension(item.offsetX, `${base}.offsetX`, tokenMap);
    validateDimension(item.offsetY, `${base}.offsetY`, tokenMap);
    validateDimension(item.blur, `${base}.blur`, tokenMap);
    if (item.spread !== undefined) {
      validateDimension(item.spread, `${base}.spread`, tokenMap);
    }
    if ('inset' in item && typeof item.inset !== 'boolean') {
      throw new Error(`Token ${path} has invalid shadow value`);
    }
  }
}
