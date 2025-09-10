import type { TokenValidator } from './index.js';
import { ALIAS_PATTERN, expectAlias } from './utils.js';

const validateFontFamily: TokenValidator = (value, path, tokenMap) => {
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    if (m) expectAlias(value, path, 'fontFamily', tokenMap);
    return;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return;
  throw new Error(`Token ${path} has invalid fontFamily value`);
};

export default validateFontFamily;
