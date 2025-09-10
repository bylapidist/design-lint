import type { Token } from '../types.js';
import { validateAliases } from '../parser/alias.js';

export function validateColor(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    validateAliases(value, path, 'color', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid color value`);
}
