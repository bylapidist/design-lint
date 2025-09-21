import { JsonPointer } from 'jsonpointerx';
import { guards } from '../../utils/index.js';

const {
  data: { isRecord },
} = guards;

const LENGTH_UNIT_PATTERN = /^(?:%|[A-Za-z][A-Za-z0-9-]*)$/;
const ANGLE_RESOLUTION_UNIT_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;
const CUSTOM_UNIT_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9-]+)+$/;

interface ReferenceValue {
  $ref: string;
}

interface FunctionValue {
  fn: string;
  parameters?: unknown[];
}

function isReferenceValue(value: unknown): value is ReferenceValue {
  if (!isRecord(value)) return false;
  if (!('$ref' in value) || typeof value.$ref !== 'string') return false;
  return Object.keys(value).length === 1;
}

function isFunctionValue(value: unknown): value is FunctionValue {
  if (!isRecord(value)) return false;
  if (typeof value.fn !== 'string') return false;
  for (const key of Object.keys(value)) {
    if (key !== 'fn' && key !== 'parameters') {
      return false;
    }
  }
  if ('parameters' in value && !Array.isArray(value.parameters)) {
    return false;
  }
  return true;
}

function assertValidReference(ref: string, path: string): void {
  try {
    JsonPointer.compile(ref);
  } catch {
    throw new Error(`Token ${path} has invalid dimension value`);
  }
}

function assertValidDimensionLiteral(
  value: Record<string, unknown>,
  path: string,
): void {
  const dimensionType = value.dimensionType;
  const rawValue = value.value;
  const unit = value.unit;
  const fontScale = value.fontScale;

  if (typeof dimensionType !== 'string') {
    throw new Error(`Token ${path} has invalid dimension value`);
  }

  const allowedKeys = new Set(['dimensionType', 'value', 'unit', 'fontScale']);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Token ${path} has invalid dimension value`);
    }
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    throw new Error(`Token ${path} has invalid dimension value`);
  }
  if (typeof unit !== 'string' || unit.length === 0) {
    throw new Error(`Token ${path} has invalid dimension value`);
  }

  switch (dimensionType) {
    case 'length':
      if (!LENGTH_UNIT_PATTERN.test(unit)) {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      if (fontScale !== undefined && typeof fontScale !== 'boolean') {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      break;
    case 'angle':
    case 'resolution':
      if (!ANGLE_RESOLUTION_UNIT_PATTERN.test(unit)) {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      if (fontScale !== undefined) {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      break;
    case 'custom':
      if (!CUSTOM_UNIT_PATTERN.test(unit)) {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      if (fontScale !== undefined) {
        throw new Error(`Token ${path} has invalid dimension value`);
      }
      break;
    default:
      throw new Error(`Token ${path} has invalid dimension value`);
  }
}

function validateDimensionEntry(value: unknown, path: string): void {
  if (isReferenceValue(value)) {
    assertValidReference(value.$ref, path);
    return;
  }

  if (isFunctionValue(value)) {
    return;
  }

  if (!isRecord(value)) {
    throw new Error(`Token ${path} has invalid dimension value`);
  }

  assertValidDimensionLiteral(value, path);
}

export function validateDimension(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new Error(`Token ${path} has invalid dimension value`);
    }
    value.forEach((entry, index) => {
      validateDimensionEntry(entry, `${path}[${String(index)}]`);
    });
    return;
  }

  validateDimensionEntry(value, path);
}
