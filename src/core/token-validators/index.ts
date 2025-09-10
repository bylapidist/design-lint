import type { Token } from '../types.js';
import color from './color.js';
import dimension from './dimension.js';
import number from './number.js';
import fontFamily from './fontFamily.js';
import fontWeight from './fontWeight.js';
import duration from './duration.js';
import cubicBezier from './cubicBezier.js';
import shadow from './shadow.js';
import strokeStyle from './strokeStyle.js';
import gradient from './gradient.js';
import typography from './typography.js';
import stringValidator from './string.js';

export type TokenValidator = (
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
) => void;

export const validatorRegistry = new Map<string, TokenValidator>();

export function registerTokenValidator(
  type: string,
  validator: TokenValidator,
): void {
  validatorRegistry.set(type, validator);
}

registerTokenValidator('color', color);
registerTokenValidator('dimension', dimension);
registerTokenValidator('number', number);
registerTokenValidator('fontFamily', fontFamily);
registerTokenValidator('fontWeight', fontWeight);
registerTokenValidator('duration', duration);
registerTokenValidator('cubicBezier', cubicBezier);
registerTokenValidator('shadow', shadow);
registerTokenValidator('strokeStyle', strokeStyle);
registerTokenValidator('gradient', gradient);
registerTokenValidator('typography', typography);
registerTokenValidator('string', stringValidator);
