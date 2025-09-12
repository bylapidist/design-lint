/**
 * @packageDocumentation
 *
 * Helpers for normalizing token configuration into theme records.
 */

import type { Config } from '../../core/linter.js';
import type { DesignTokens } from '../../core/types.js';
import { isDesignTokens, isThemeRecord } from '../guards/domain/index.js';

/**
 * Normalize a configuration's token definitions into a theme record.
 *
 * Accepts token structures from {@link Config.tokens} which may be a single
 * design token object or a mapping of theme names to token objects. The result
 * is always an object keyed by theme name. A solitary token object is assigned
 * to the `default` theme.
 *
 * @param tokens - Token definitions from the configuration.
 * @returns A record of theme names mapped to design token objects.
 */
export function toThemeRecord(
  tokens: Config['tokens'],
): Record<string, DesignTokens> {
  if (!tokens) return {};
  if (isThemeRecord(tokens)) return tokens;
  if (isDesignTokens(tokens)) return { default: tokens };
  return {};
}
