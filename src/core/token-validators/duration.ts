import type { TokenValidator } from './index.js';
import { isRecord, expectAlias } from './utils.js';

const DURATION_UNITS = new Set(['ms', 's']);

const validateDuration: TokenValidator = (value, path, tokenMap) => {
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
};

export default validateDuration;
