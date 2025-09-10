import type { Token } from '../types.js';
import { validateAliases } from '../parser/alias.js';
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
    validateAliases(value, path, 'duration', tokenMap, { require: true });
    return;
  }
  throw new Error(`Token ${path} has invalid duration value`);
}
