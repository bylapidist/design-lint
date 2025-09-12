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
  // Input must be a plain object mapping theme names to token sets.
  if (!isRecord(val)) return false;

  // Ignore metadata keys (those starting with `$`).
  const entries = Object.entries(val).filter(([k]) => !k.startsWith('$'));
  if (entries.length === 0) return false;

  if (entries.length === 1) {
    // For a single theme, ensure it contains nested theme objects rather than
    // only direct token definitions.
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

  // For multiple themes, track the intersection of their token keys to ensure
  // they share at least one common token.
  let shared: string[] | null = null;
  for (const [, theme] of entries) {
    // Each theme must itself be a record.
    if (!isRecord(theme)) return false;

    // Collect the non-metadata token keys for the current theme.
    const keys = Object.keys(theme).filter((k) => !k.startsWith('$'));

    if (shared === null) {
      // Initialize the intersection with the first theme's keys.
      shared = keys;
    } else {
      // Narrow the intersection to keys present in every theme so far.
      shared = shared.filter((k) => keys.includes(k));
      // If no keys remain in common, the value can't be a theme record.
      if (shared.length === 0) return false;
    }
  }
  return true;
};
