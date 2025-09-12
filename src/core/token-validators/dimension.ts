import { guards } from '../../utils/index.js';
import type { Token } from '../types.js';

const {
  data: { isRecord },
} = guards;

const DIMENSION_UNITS = new Set([
  'px',
  'rem',
  'em',
  'vh',
  'vw',
  'vmin',
  'vmax',
  'ch',
]);

export function validateDimension(
  value: unknown,
  path: string,
  _tokenMap?: Map<string, Token>,
  warn?: (msg: string) => void,
): void {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string'
  ) {
    if (!DIMENSION_UNITS.has(value.unit)) {
      warn?.(`Token ${path} uses unknown unit ${value.unit}`);
    }
    return;
  }
  throw new Error(`Token ${path} has invalid dimension value`);
}
