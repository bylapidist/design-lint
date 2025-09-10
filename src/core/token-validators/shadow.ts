import type { TokenValidator } from './index.js';
import { isRecord } from './utils.js';
import validateColor from './color.js';
import validateDimension from './dimension.js';

const validateShadow: TokenValidator = (value, path, tokenMap) => {
  const items = Array.isArray(value) ? value : [value];
  if (!Array.isArray(items)) {
    throw new Error(`Token ${path} has invalid shadow value`);
  }
  for (let i = 0; i < items.length; i++) {
    const item: unknown = items[i];
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
};

export default validateShadow;
