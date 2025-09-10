import type { Token } from '../types.js';
import { expectAlias, isAlias } from '../parser/normalize.js';

export function validateColor(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    if (isAlias(value)) expectAlias(value, path, 'color', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid color value`);
}
