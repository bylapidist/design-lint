export function validateFontFamily(value: unknown, path: string): void {
  if (typeof value === 'string') return;
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return;
  throw new Error(`Token ${path} has invalid fontFamily value`);
}
