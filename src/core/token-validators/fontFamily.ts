import type { Token } from '../types.js';
import { expectAlias, isAlias } from '../parser/normalize.js';

export function validateFontFamily(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    if (isAlias(value)) expectAlias(value, path, 'fontFamily', tokenMap);
    return;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return;
  throw new Error(`Token ${path} has invalid fontFamily value`);
}
