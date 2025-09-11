import { isRecord } from '../../utils/type-guards.js';

export { isRecord };

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function toArray(value: unknown): unknown[] {
  return isArray(value) ? value : [value];
}
