import type { TokenValidator } from './index.js';
import { ALIAS_PATTERN, expectAlias } from './utils.js';

const validateColor: TokenValidator = (value, path, tokenMap) => {
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    if (m) expectAlias(value, path, 'color', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid color value`);
};

export default validateColor;
