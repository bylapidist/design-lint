import { guards } from '../../utils/index.js';
import { validateColor } from './color.js';
import { validateDimension } from './dimension.js';
import { validateStrokeStyle } from './strokeStyle.js';

const {
  data: { isRecord },
} = guards;

export function validateBorder(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new Error(`Token ${path} has invalid border value`);
  }
  const allowed = new Set(['color', 'width', 'style']);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`Token ${path} has invalid border value`);
    }
  }
  for (const key of allowed) {
    if (!(key in value)) {
      throw new Error(`Token ${path} has invalid border value`);
    }
  }
  validateColor(value.color, `${path}.color`);
  validateDimension(value.width, `${path}.width`);
  validateStrokeStyle(value.style, `${path}.style`);
}
