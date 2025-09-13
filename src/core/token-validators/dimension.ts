import { guards } from '../../utils/index.js';

const {
  data: { isRecord },
} = guards;

const DIMENSION_UNITS = new Set(['px', 'rem']);

export function validateDimension(value: unknown, path: string): void {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    Number.isFinite(value.value) &&
    typeof value.unit === 'string' &&
    DIMENSION_UNITS.has(value.unit)
  ) {
    return;
  }
  throw new Error(`Token ${path} has invalid dimension value`);
}
