import { guards, collections } from '../../utils/index.js';
import { validateColor } from './color.js';
import { validateDimension } from './dimension.js';

const {
  data: { isRecord },
} = guards;
const { toArray } = collections;

export function validateShadow(value: unknown, path: string): void {
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
    validateColor(item.color, `${base}.color`);
    validateDimension(item.offsetX, `${base}.offsetX`);
    validateDimension(item.offsetY, `${base}.offsetY`);
    validateDimension(item.blur, `${base}.blur`);
    if (item.spread !== undefined) {
      validateDimension(item.spread, `${base}.spread`);
    }
    if ('inset' in item && typeof item.inset !== 'boolean') {
      throw new Error(`Token ${path} has invalid shadow value`);
    }
  }
}
