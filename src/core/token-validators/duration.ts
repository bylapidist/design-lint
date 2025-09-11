import { isRecord } from '../../utils/is-record';

const DURATION_UNITS = new Set(['ms', 's']);

export function validateDuration(value: unknown, path: string): void {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string' &&
    DURATION_UNITS.has(value.unit)
  ) {
    return;
  }
  throw new Error(`Token ${path} has invalid duration value`);
}
