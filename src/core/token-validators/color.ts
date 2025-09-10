import type { Token } from '../types.js';
import { expectAlias, isAlias } from '../parser/normalize.js';
import { parse } from 'culori';

export function validateColor(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    if (isAlias(value)) {
      expectAlias(value, path, 'color', tokenMap);
      return;
    }
    const parsed = parse(value);
    if (parsed && (parsed.mode === 'rgb' || parsed.mode === 'hsl')) return;
  }
  throw new Error(`Token ${path} has invalid color value`);
}
