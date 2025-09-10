import type { TokenValidator } from './index.js';
import { expectAlias } from './utils.js';

const validateNumber: TokenValidator = (value, path, tokenMap) => {
  if (typeof value === 'number') return;
  if (typeof value === 'string') {
    expectAlias(value, path, 'number', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid number value`);
};

export default validateNumber;
