import type { Token } from '../types';
import { validateColor } from './color';
import { validateDimension } from './dimension';
import { validateNumber } from './number';
import { validateFontFamily } from './fontFamily';
import { validateFontWeight } from './fontWeight';
import { validateDuration } from './duration';
import { validateCubicBezier } from './cubicBezier';
import { validateShadow } from './shadow';
import { validateStrokeStyle } from './strokeStyle';
import { validateGradient } from './gradient';
import { validateTypography } from './typography';

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
