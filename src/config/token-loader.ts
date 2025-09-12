/**
 * @packageDocumentation
 *
 * Helper for loading and validating design token definitions.
 */
import path from 'node:path';
import {
  readDesignTokensFile,
  TokenParseError,
} from '../adapters/node/token-parser.js';
import type { DesignTokens } from '../core/types.js';
import { guards } from '../utils/index.js';
import { normalizeTokens } from './normalize-tokens.js';
import { wrapTokenError } from './token-errors.js';

const {
  data: { isRecord },
  domain: { isDesignTokens, isThemeRecord },
} = guards;

/**
 * Load and validate design tokens defined in configuration.
 *
 * Token groups or entire design token objects may be provided inline as
 * objects, or as file paths relative to a base directory. Each token set is
 * parsed and validated using {@link parseDesignTokens}.
 *
 * @param tokens - Token definitions or file path references keyed by theme.
 * @param baseDir - Directory used to resolve token file paths.
 * @returns A theme record or single design token object.
 * @throws {TokenParseError} When token parsing fails.
 * @throws {Error} When token files cannot be read.
 *
 * @example
 * ```ts
 * const tokens = await loadTokens({ light: './light.tokens.json' }, process.cwd());
 * console.log(Object.keys(tokens));
 * ```
 */
export async function loadTokens(
  tokens: unknown,
  baseDir: string,
): Promise<DesignTokens | Record<string, DesignTokens>> {
  if (!isRecord(tokens)) return {};

  // If a design token object is provided directly (i.e. all entries are objects
  // and none are file path strings aside from metadata keys), normalize it and
  // return the single theme result. This preserves any root-level metadata such
  // as `$schema` declarations.
  if (
    isDesignTokens(tokens) &&
    !isThemeRecord(tokens) &&
    !Object.entries(tokens).some(
      ([k, v]) => typeof v === 'string' && !k.startsWith('$'),
    )
  ) {
    const normalized = normalizeTokens(tokens);
    return normalized.default;
  }

  const themes: Record<string, unknown> = {};
  for (const [theme, val] of Object.entries(tokens)) {
    if (typeof val === 'string') {
      const filePath = path.resolve(baseDir, val);
      try {
        themes[theme] = await readDesignTokensFile(filePath);
      } catch (err) {
        if (err instanceof TokenParseError) throw err;
        throw wrapTokenError(theme, err, 'read');
      }
    } else {
      themes[theme] = val;
    }
  }

  const normalized = normalizeTokens(themes);
  return 'default' in normalized && Object.keys(normalized).length === 1
    ? normalized.default
    : normalized;
}
