/**
 * @packageDocumentation
 *
 * Helpers for deriving canonical CSS color strings from DTIF token values.
 */

import { formatHex, formatHsl, formatRgb, parse } from 'culori';
import type { FlattenedToken } from '../../core/types.js';
import { validateColor } from '../../core/token-validators/color.js';
import type { ColorValue } from '../../core/token-validators/color.js';
import { buildColorString } from '../../core/parser/normalize-colors.js';

function addNormalizedValue(
  target: Set<string>,
  value: string | null | undefined,
): void {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (trimmed === '') return;
  target.add(trimmed.toLowerCase());
}

/**
 * Collect canonical color representations for a flattened color token.
 *
 * Tokens may express color payloads as raw CSS strings or DTIF objects with a
 * `colorSpace` and `components`. This helper normalizes both shapes into a set
 * of lowercase CSS strings so lint rules can compare raw color usage against
 * declared token values regardless of format.
 */
export function collectColorTokenValues(token: FlattenedToken): string[] {
  if (token.type !== 'color') {
    return [];
  }

  const values = new Set<string>();
  const rawValues =
    token.candidates && token.candidates.length > 0
      ? token.candidates.map((candidate) => candidate.value)
      : [token.value];

  for (const raw of rawValues) {
    if (typeof raw === 'string') {
      addNormalizedValue(values, raw);
      const parsed = parse(raw);
      if (parsed) {
        addNormalizedValue(values, formatRgb(parsed));
        addNormalizedValue(values, formatHex(parsed));
        addNormalizedValue(values, formatHsl(parsed));
      }
      continue;
    }

    if (!raw || typeof raw !== 'object') {
      continue;
    }

    let value: ColorValue;
    try {
      validateColor(raw, token.path);
      value = raw;
    } catch {
      continue;
    }

    addNormalizedValue(values, value.hex);
    const css = buildColorString(
      value.colorSpace,
      value.components,
      value.alpha,
    );
    addNormalizedValue(values, css);

    const parsed = parse(css);
    if (parsed) {
      addNormalizedValue(values, formatRgb(parsed));
      addNormalizedValue(values, formatHex(parsed));
      addNormalizedValue(values, formatHsl(parsed));
    }
  }

  return [...values];
}
