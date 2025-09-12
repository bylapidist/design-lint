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
import { guards, tokens } from '../utils/index.js';

const {
  data: { isRecord },
  domain: { isDesignTokens, isThemeRecord },
} = guards;
const { wrapTokenError, normalizeTokens } = tokens;

function splitMeta(tokens: DesignTokens): {
  meta: Record<string, unknown>;
  tokens: Record<string, unknown>;
} {
  const meta: Record<string, unknown> = {};
  const tokenPart: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (k.startsWith('$')) meta[k] = v;
    else tokenPart[k] = v;
  }
  return { meta, tokens: tokenPart };
}

function mergeTokens(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  for (const [k, v] of Object.entries(override)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") {
      continue;
    }
    if (isRecord(v) && isRecord(base[k])) {
      mergeTokens(base[k], v);
    } else {
      base[k] = v;
    }
  }
  return base;
}

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

  if ('default' in normalized && Object.keys(normalized).length > 1) {
    const { default: base, ...variants } = normalized;
    const { tokens: baseTokens } = splitMeta(base);
    const merged: Record<string, unknown> = { default: base };
    for (const [theme, t] of Object.entries(variants)) {
      const { meta, tokens: part } = splitMeta(t);
      const clone = mergeTokens(structuredClone(baseTokens), part);
      merged[theme] = { ...meta, ...clone };
    }
    return normalizeTokens(merged);
  }

  return 'default' in normalized && Object.keys(normalized).length === 1
    ? normalized.default
    : normalized;
}
