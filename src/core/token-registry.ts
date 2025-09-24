import type { DesignTokens, DtifFlattenedToken, JsonPointer } from './types.js';
import { type NameTransform } from '../utils/tokens/index.js';
import { getDtifFlattenedTokens } from '../utils/tokens/dtif-cache.js';
import { DtifTokenRegistry } from './dtif/token-registry.js';

export interface TokenRegistryOptions {
  nameTransform?: NameTransform;
}

/**
 * Registry for flattened design tokens keyed by theme and normalized path.
 *
 * Provides lookup and aggregation utilities used by the linter and generators.
 */
export class TokenRegistry {
  private dtifRegistry: DtifTokenRegistry;

  /**
   * Create a token registry from a record of theme token objects.
   *
   * @param tokensByTheme - Mapping of theme names to design tokens.
   * @param options - Optional configuration controlling name transforms.
   */
  constructor(
    tokensByTheme: Record<string, DesignTokens | readonly DtifFlattenedToken[]>,
    options?: TokenRegistryOptions,
  ) {
    const transform = options?.nameTransform;
    const dtifTokensByTheme: Record<string, readonly DtifFlattenedToken[]> = {};
    for (const [theme, tokens] of Object.entries(tokensByTheme)) {
      if (theme.startsWith('$')) continue;
      const dtifTokens = toDtifFlattenedTokens(tokens, theme);
      dtifTokensByTheme[theme] = dtifTokens;
    }

    this.dtifRegistry = new DtifTokenRegistry(dtifTokensByTheme, {
      nameTransform: transform,
    });
  }

  getDtifTokenByPointer(
    pointer: JsonPointer,
    theme?: string,
  ): DtifFlattenedToken | undefined {
    return this.dtifRegistry.getByPointer(pointer, theme);
  }

  getDtifTokenByName(
    name: string,
    theme?: string,
  ): DtifFlattenedToken | undefined {
    return this.dtifRegistry.getByName(name, theme);
  }

  getDtifTokens(theme?: string): DtifFlattenedToken[] {
    return this.dtifRegistry.getTokens(theme);
  }
}

function toDtifFlattenedTokens(
  tokens: DesignTokens | readonly DtifFlattenedToken[] | undefined,
  theme: string,
): readonly DtifFlattenedToken[] {
  if (!tokens) {
    return [];
  }

  if (isDtifFlattenedTokenArray(tokens)) {
    return tokens;
  }

  const cached = getDtifFlattenedTokens(tokens);
  if (cached !== undefined) {
    return cached;
  }

  if (isDtifDocument(tokens)) {
    throw new Error(
      `Missing cached DTIF tokens for theme "${theme}". ` +
        'Call ensureDtifFlattenedTokens or normalizeTokens before constructing a TokenRegistry.',
    );
  }

  throw new Error(
    `TokenRegistry requires DTIF token documents or flattened DTIF arrays for theme "${theme}".`,
  );
}

function isDtifFlattenedTokenArray(
  tokens: DesignTokens | readonly DtifFlattenedToken[],
): tokens is readonly DtifFlattenedToken[] {
  return Array.isArray(tokens) && tokens.every(isDtifFlattenedTokenLike);
}

function isDtifFlattenedTokenLike(
  value: unknown,
): value is { pointer: string } {
  if (!hasPointerProperty(value)) {
    return false;
  }
  return typeof value.pointer === 'string';
}

function hasPointerProperty(value: unknown): value is { pointer: unknown } {
  return typeof value === 'object' && value !== null && 'pointer' in value;
}

function isDtifDocument(value: unknown): value is DesignTokens {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(value, '$version');
}
