import type { Token } from '../types.js';
import { validateAliases } from '../parser/alias.js';
import { isRecord } from './utils.js';

const DIMENSION_UNITS = new Set(['px', 'rem']);

export function validateDimension(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string' &&
    DIMENSION_UNITS.has(value.unit)
  ) {
    return;
  }
  if (typeof value === 'string') {
    validateAliases(value, path, 'dimension', tokenMap, { require: true });
    return;
  }
  throw new Error(`Token ${path} has invalid dimension value`);
}
