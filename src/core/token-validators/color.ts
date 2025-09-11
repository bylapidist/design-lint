import { parse } from 'culori';

export function validateColor(value: unknown, path: string): void {
  if (typeof value === 'string') {
    const parsed = parse(value);
    if (parsed && (parsed.mode === 'rgb' || parsed.mode === 'hsl')) return;
  }
  throw new Error(`Token ${path} has invalid color value`);
}
