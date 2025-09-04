import type { DesignTokens } from './types.js';

/**
 * Normalize design tokens.
 * When wrapVar is true, string tokens are wrapped in `var()` unless they
 * already use it.
 *
 * @param tokens Raw design tokens.
 * @param wrapVar Wrap string tokens in `var()`.
 * @returns Normalized tokens.
 */
export function normalizeTokens(
  tokens: DesignTokens | undefined,
  wrapVar = false,
): DesignTokens {
  const normalized: DesignTokens = {};
  if (!tokens) return normalized;
  for (const [group, defs] of Object.entries(tokens)) {
    if (!defs || typeof defs !== 'object') {
      (normalized as Record<string, unknown>)[group] = defs as unknown;
      continue;
    }
    const map: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(
      defs as Record<string, unknown>,
    )) {
      if (wrapVar && typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('var(')) {
          map[name] = trimmed;
        } else {
          const tokenName = trimmed.startsWith('--') ? trimmed : `--${trimmed}`;
          map[name] = `var(${tokenName})`;
        }
      } else {
        map[name] = value;
      }
    }
    (normalized as Record<string, unknown>)[group] = map;
  }
  return normalized;
}
