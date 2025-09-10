import type { TokenValidator } from './index.js';
import { isRecord, expectAlias } from './utils.js';

const DIMENSION_UNITS = new Set(['px', 'rem']);

const validateDimension: TokenValidator = (value, path, tokenMap) => {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string' &&
    DIMENSION_UNITS.has(value.unit)
  ) {
    return;
  }
  if (typeof value === 'string') {
    expectAlias(value, path, 'dimension', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid dimension value`);
};

export default validateDimension;
