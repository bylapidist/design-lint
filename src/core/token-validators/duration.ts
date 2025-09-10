import type { Token } from '../types.js';
import { expectAlias } from '../parser/normalize.js';
import { isRecord } from './utils.js';

const DURATION_UNITS = new Set(['ms', 's']);

export function validateDuration(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string' &&
    DURATION_UNITS.has(value.unit)
  ) {
    return;
  }
  if (typeof value === 'string') {
    expectAlias(value, path, 'duration', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid duration value`);
}
