import { isRecord } from './utils.js';
import { validateDimension } from './dimension.js';

const STROKE_STYLE_KEYWORDS = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'outset',
  'inset',
]);
const STROKE_LINECAPS = new Set(['round', 'butt', 'square']);

export function validateStrokeStyle(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (!STROKE_STYLE_KEYWORDS.has(value)) {
      throw new Error(`Token ${path} has invalid strokeStyle value`);
    }
    return;
  }
  if (isRecord(value)) {
    const allowed = new Set(['dashArray', 'lineCap']);
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        throw new Error(`Token ${path} has invalid strokeStyle value`);
      }
    }
    if (!Array.isArray(value.dashArray) || value.dashArray.length === 0) {
      throw new Error(`Token ${path} has invalid strokeStyle value`);
    }
    for (let i = 0; i < value.dashArray.length; i++) {
      validateDimension(value.dashArray[i], `${path}.dashArray[${String(i)}]`);
    }
    if (
      typeof value.lineCap !== 'string' ||
      !STROKE_LINECAPS.has(value.lineCap)
    ) {
      throw new Error(`Token ${path} has invalid strokeStyle value`);
    }
    return;
  }
  throw new Error(`Token ${path} has invalid strokeStyle value`);
}
