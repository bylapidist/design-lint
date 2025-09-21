import { guards } from '../../utils/index.js';

const {
  data: { isRecord },
} = guards;

const PLATFORM_IDENTIFIER = /^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/;

const TIME_DURATION_TYPES = new Set([
  'css.transition-duration',
  'css.transition-delay',
  'css.animation-duration',
  'css.animation-delay',
  'ios.caanimation.duration',
  'android.value-animator.duration',
]);

const FRAME_COUNT_DURATION_TYPES = new Set([
  'ios.cadisplaylink.frame-count',
  'android.choreographer.frame-count',
]);

const FRACTION_DURATION_TYPES = new Set([
  'css.timeline.progress',
  'ios.uianimation.fraction',
  'android.animator-set.fraction',
]);

const TIME_UNITS = new Set(['ms', 's']);

export function validateDuration(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new Error(`Token ${path} has invalid duration value`);
  }

  const type = Reflect.get(value, 'durationType');
  const rawValue = Reflect.get(value, 'value');
  const unit = Reflect.get(value, 'unit');

  if (typeof type !== 'string' || !PLATFORM_IDENTIFIER.test(type)) {
    throw new Error(`Token ${path} has invalid duration value`);
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    throw new Error(`Token ${path} has invalid duration value`);
  }

  if (typeof unit !== 'string' || unit.length === 0) {
    throw new Error(`Token ${path} has invalid duration value`);
  }

  if (TIME_DURATION_TYPES.has(type)) {
    if (!TIME_UNITS.has(unit) || rawValue < 0) {
      throw new Error(`Token ${path} has invalid duration value`);
    }
    return;
  }

  if (FRAME_COUNT_DURATION_TYPES.has(type)) {
    if (!Number.isInteger(rawValue) || rawValue < 0 || unit !== 'frames') {
      throw new Error(`Token ${path} has invalid duration value`);
    }
    return;
  }

  if (FRACTION_DURATION_TYPES.has(type)) {
    if (rawValue < 0 || unit !== '%') {
      throw new Error(`Token ${path} has invalid duration value`);
    }
    return;
  }

  if (!PLATFORM_IDENTIFIER.test(unit)) {
    throw new Error(`Token ${path} has invalid duration value`);
  }
}
