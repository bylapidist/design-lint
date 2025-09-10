import type { Token } from '../types.js';
import { validateAliases } from '../parser/alias.js';

export function validateNumber(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'number') return;
  if (typeof value === 'string') {
    validateAliases(value, path, 'number', tokenMap, { require: true });
    return;
  }
  throw new Error(`Token ${path} has invalid number value`);
}
