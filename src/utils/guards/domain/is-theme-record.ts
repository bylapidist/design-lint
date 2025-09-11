import type { DesignTokens } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

/**
 * Determines whether a value is a record of theme names mapping to design tokens.
 *
 * A valid theme record:
 * - Is a record with at least one non-metadata key (keys not starting with `$`).
 * - For a single theme, it must contain at least one nested theme object (not
 *   just design tokens).
 * - For multiple themes, they must share at least one common token key.
 *
 * @param val - The value to test.
 * @returns `true` if the value is a theme record, `false` otherwise.
 *
 * @example
 * isThemeRecord({ light: { color: { red: { $value: '#f00' } } } }); // => true
 */
export const isThemeRecord = (
  val: unknown,
): val is Record<string, DesignTokens> => {
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
};
