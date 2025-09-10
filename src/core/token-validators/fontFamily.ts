import type { Token } from '../types.js';
import { validateAliases } from '../parser/alias.js';

export function validateFontFamily(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    validateAliases(value, path, 'fontFamily', tokenMap);
    return;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return;
  throw new Error(`Token ${path} has invalid fontFamily value`);
}
