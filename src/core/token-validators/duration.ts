import { JsonPointer } from 'jsonpointerx';
import { guards } from '../../utils/index.js';

const {
  data: { isRecord },
} = guards;

const TIME_CONTEXT_PATTERN =
  /^(?:css\.(?:transition|animation)-duration|ios\.caanimation\.duration|android\.value-animator\.duration)$/;
const FRAME_CONTEXT_PATTERN =
  /^(?:ios\.cadisplaylink\.frame-count|android\.choreographer\.frame-count)$/;
const FRACTION_CONTEXT_PATTERN =
  /^(?:css\.timeline\.progress|ios\.uianimation\.fraction|android\.animator-set\.fraction)$/;

const TIME_UNITS = new Set(['ms', 's']);
const FRACTION_UNITS = new Set(['%']);

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

function assertValidReference(ref: string, path: string): void {
  try {
    JsonPointer.compile(ref);
  } catch {
    throw new Error(`Token ${path} has invalid duration value`);
  }
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

function assertValidDurationLiteral(
  value: Record<string, unknown>,
  path: string,
): void {
  const durationType = value.durationType;
  const rawValue = value.value;
  const unit = value.unit;

  const allowedKeys = new Set(['durationType', 'value', 'unit']);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Token ${path} has invalid duration value`);
    }
  }

  if (typeof durationType !== 'string' || durationType.length === 0) {
    throw new Error(`Token ${path} has invalid duration value`);
  }

  if (typeof unit !== 'string' || unit.length === 0) {
    throw new Error(`Token ${path} has invalid duration value`);
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    throw new Error(`Token ${path} has invalid duration value`);
  }

  if (TIME_CONTEXT_PATTERN.test(durationType)) {
    if (rawValue < 0 || !TIME_UNITS.has(unit)) {
      throw new Error(`Token ${path} has invalid duration value`);
    }
    return;
  }

  if (FRAME_CONTEXT_PATTERN.test(durationType)) {
    if (!Number.isInteger(rawValue) || rawValue < 0 || unit !== 'frames') {
      throw new Error(`Token ${path} has invalid duration value`);
    }
    return;
  }

  if (FRACTION_CONTEXT_PATTERN.test(durationType)) {
    if (!FRACTION_UNITS.has(unit)) {
      throw new Error(`Token ${path} has invalid duration value`);
    }
    return;
  }
}

function validateDurationEntry(value: unknown, path: string): void {
  if (isReferenceValue(value)) {
    assertValidReference(value.$ref, path);
    return;
  }

  if (isFunctionValue(value)) {
    return;
  }

  if (!isRecord(value)) {
    throw new Error(`Token ${path} has invalid duration value`);
  }

  assertValidDurationLiteral(value, path);
}

export function validateDuration(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new Error(`Token ${path} has invalid duration value`);
    }
    value.forEach((entry, index) => {
      validateDurationEntry(entry, `${path}[${String(index)}]`);
    });
    return;
  }

  validateDurationEntry(value, path);
}
