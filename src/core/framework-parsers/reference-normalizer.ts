export function normalizeStylePropertyName(name: string): string {
  if (name.startsWith('--')) return name;
  if (name.includes('-')) return name.toLowerCase();
  const kebab = name.replace(/[A-Z]/g, (segment) => `-${segment}`);
  const lower = kebab.toLowerCase();
  return lower.startsWith('ms-') ? `-${lower}` : lower;
}
