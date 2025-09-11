import { isRecord } from '../../utils/is-record';

const DIMENSION_UNITS = new Set(['px', 'rem']);

export function validateDimension(value: unknown, path: string): void {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string' &&
    DIMENSION_UNITS.has(value.unit)
  ) {
    return;
  }
  throw new Error(`Token ${path} has invalid dimension value`);
}
