export function validateNumber(value: unknown, path: string): void {
  if (typeof value === 'number') return;
  throw new Error(`Token ${path} has invalid number value`);
}
