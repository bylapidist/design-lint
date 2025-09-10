import type { Token } from '../types.js';
import { expectAlias } from '../parser/normalize.js';

export function validateNumber(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'number') return;
  if (typeof value === 'string') {
    expectAlias(value, path, 'number', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid number value`);
}
