import type { DesignTokens } from '../types.js';
import {
  DTIF_VALIDATION_MESSAGE,
  formatDtifErrors,
  validateDtif,
} from '../../utils/dtif/validator.js';

export function validateTokens(tokens: DesignTokens): void {
  const result = validateDtif(tokens);
  if (result.valid) {
    return;
  }

  const detail = formatDtifErrors(result.errors);
  if (detail === DTIF_VALIDATION_MESSAGE) {
    throw new Error(DTIF_VALIDATION_MESSAGE);
  }

  throw new Error(`DTIF validation failed:\n${detail}`);
}
