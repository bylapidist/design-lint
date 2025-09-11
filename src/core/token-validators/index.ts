import type { Token } from '../types.js';
import { validateColor } from './color.js';
import { validateDimension } from './dimension.js';
import { validateNumber } from './number.js';
import { validateFontFamily } from './fontFamily.js';
import { validateFontWeight } from './fontWeight.js';
import { validateDuration } from './duration.js';
import { validateCubicBezier } from './cubicBezier.js';
import { validateShadow } from './shadow.js';
import { validateStrokeStyle } from './strokeStyle.js';
import { validateGradient } from './gradient.js';
import { validateTypography } from './typography.js';

export type TokenValidator = (
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
) => void;

export const validatorRegistry = new Map<string, TokenValidator>([
  ['color', validateColor],
  ['dimension', validateDimension],
  ['number', validateNumber],
  ['fontFamily', validateFontFamily],
  ['fontWeight', validateFontWeight],
  ['duration', validateDuration],
  ['cubicBezier', validateCubicBezier],
  ['shadow', validateShadow],
  ['strokeStyle', validateStrokeStyle],
  ['gradient', validateGradient],
  ['typography', validateTypography],
]);

export function registerTokenValidator(
  type: string,
  validator: TokenValidator,
): void {
  validatorRegistry.set(type, validator);
}
