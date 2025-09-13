import { guards } from '../../utils/index.js';
import { validateDuration } from './duration.js';
import { validateCubicBezier } from './cubicBezier.js';

const {
  data: { isRecord },
} = guards;

export function validateTransition(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new Error(`Token ${path} has invalid transition value`);
  }
  const allowed = new Set(['duration', 'delay', 'timingFunction']);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`Token ${path} has invalid transition value`);
    }
  }
  for (const key of allowed) {
    if (!(key in value)) {
      throw new Error(`Token ${path} has invalid transition value`);
    }
  }
  validateDuration(value.duration, `${path}.duration`);
  validateDuration(value.delay, `${path}.delay`);
  validateCubicBezier(value.timingFunction, `${path}.timingFunction`);
}
