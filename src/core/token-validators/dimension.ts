import { guards } from '../../utils/index.js';

const {
  data: { isRecord },
} = guards;

const ALLOWED_DIMENSION_TYPES = new Set([
  'length',
  'angle',
  'resolution',
  'custom',
]);
const DIMENSION_KEYS = new Set(['dimensionType', 'value', 'unit', 'fontScale']);
const LENGTH_UNIT_PATTERN = /^(?:%|[A-Za-z][A-Za-z0-9-]*)$/;
const ANGLE_OR_RESOLUTION_UNIT_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;
const CUSTOM_UNIT_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9-]+)+$/;

export function validateDimension(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new Error(`Token ${path} has invalid dimension value`);
  }

  const dimensionType = Reflect.get(value, 'dimensionType');
  const magnitude = Reflect.get(value, 'value');
  const unit = Reflect.get(value, 'unit');
  const fontScale = Reflect.get(value, 'fontScale');

  if (
    typeof dimensionType !== 'string' ||
    !ALLOWED_DIMENSION_TYPES.has(dimensionType)
  ) {
    throw new Error(`Token ${path} has invalid dimension value`);
  }

  if (typeof magnitude !== 'number' || !Number.isFinite(magnitude)) {
    throw new Error(`Token ${path} has invalid dimension value`);
  }

  if (typeof unit !== 'string') {
    throw new Error(`Token ${path} has invalid dimension value`);
  }

  switch (dimensionType) {
    case 'length':
      if (!LENGTH_UNIT_PATTERN.test(unit)) {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      break;
    case 'angle':
    case 'resolution':
      if (!ANGLE_OR_RESOLUTION_UNIT_PATTERN.test(unit)) {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      break;
    case 'custom':
      if (!CUSTOM_UNIT_PATTERN.test(unit)) {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      break;
    default:
      throw new Error(`Token ${path} has invalid dimension value`);
  }

  if (fontScale !== undefined) {
    if (dimensionType !== 'length') {
      throw new Error(`Token ${path} has invalid dimension value`);
    }
    if (typeof fontScale !== 'boolean') {
      throw new Error(`Token ${path} has invalid dimension value`);
    }
  }

  for (const key of Object.keys(value)) {
    if (!DIMENSION_KEYS.has(key)) {
      throw new Error(`Token ${path} has invalid dimension value`);
    }
  }

  if (dimensionType !== 'length' && 'fontScale' in value) {
    throw new Error(`Token ${path} has invalid dimension value`);
  }
}
