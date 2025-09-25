import type { DesignTokens } from '../../../core/types.js';
import { isRecord } from '../data/index.js';
import { getDtifFlattenedTokens } from '../../tokens/dtif-cache.js';

const TOKEN_METADATA_IGNORE = new Set(['$type', '$value', '$ref']);

/**
 * Determines whether a value is a record of theme names mapping to design tokens.
 *
 * A valid theme record:
 * - Is a record with at least one non-metadata key (keys not starting with `$`).
 * - For a single theme, it must contain at least one nested theme object (not
 *   just design tokens).
 * - For multiple themes, either each theme must expose DTIF metadata or they
 *   must share at least one common token key.
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

  // DTIF token documents expose metadata like $version, which distinguishes
  // them from theme records that group multiple documents.
  if (Object.prototype.hasOwnProperty.call(val, '$version')) {
    return false;
  }

  // DTIF token documents receive cached flattened tokens. Those objects are
  // single-theme documents and should not be mistaken for theme records.
  if (getDtifFlattenedTokens(val)) return false;

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
  let allHaveMetadata = true;

  for (const [, theme] of entries) {
    // Each theme must itself be a record.
    if (!isRecord(theme)) return false;

    if (!hasThemeMetadata(theme)) {
      allHaveMetadata = false;
    }

    // Collect the non-metadata token keys for the current theme.
    const keys = Object.keys(theme).filter((k) => !k.startsWith('$'));

    if (shared === null) {
      // Initialize the intersection with the first theme's keys.
      shared = keys;
    } else {
      // Narrow the intersection to keys present in every theme so far.
      shared = shared.filter((k) => keys.includes(k));
    }
  }

  if (allHaveMetadata) {
    return true;
  }

  return Boolean(shared?.length);
};

function hasThemeMetadata(theme: Record<string, unknown>): boolean {
  return Object.keys(theme).some(
    (key) => key.startsWith('$') && !TOKEN_METADATA_IGNORE.has(key),
  );
}
