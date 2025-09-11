import type { DesignTokens } from '../core/types.js';

export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value);
}

export function isDesignTokens(value: unknown): value is DesignTokens {
  return isRecord(value);
}

export function isThemeRecord(
  val: unknown,
): val is Record<string, DesignTokens> {
  if (!isRecord(val)) return false;
  const entries = Object.entries(val).filter(([k]) => !k.startsWith('$'));
  if (entries.length === 0) return false;
  if (entries.length === 1) {
    const [, theme] = entries[0];
    if (!isRecord(theme)) return false;
    const children = Object.entries(theme)
      .filter(([k]) => !k.startsWith('$'))
      .map(([, v]) => v);
    const allTokens = children.every(
      (child) => isRecord(child) && ('$value' in child || 'value' in child),
    );
    return !allTokens;
  }
  let shared: string[] | null = null;
  for (const [, theme] of entries) {
    if (!isRecord(theme)) return false;
    const keys = Object.keys(theme).filter((k) => !k.startsWith('$'));
    if (shared === null) {
      shared = keys;
    } else {
      shared = shared.filter((k) => keys.includes(k));
      if (shared.length === 0) return false;
    }
  }
  return true;
}
