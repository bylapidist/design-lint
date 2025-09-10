import type { TokenValidator } from './index.js';
import { ALIAS_PATTERN, expectAlias } from './utils.js';

const validateString: TokenValidator = (value, path, tokenMap) => {
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    if (m) expectAlias(value, path, 'string', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid string value`);
};

export default validateString;
