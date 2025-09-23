/**
 * @packageDocumentation
 *
 * Internal helpers for caching flattened DTIF tokens alongside the original
 * token documents. This allows synchronous consumers such as flatten helpers
 * to reuse async parse results gathered during configuration loading without
 * reparsing the DTIF payload.
 */

import type { DesignTokens, DtifFlattenedToken } from '../../core/types.js';
import { parseDtifTokenObject } from '../../core/dtif/parse.js';

const DTIF_FLATTENED_TOKENS = Symbol.for(
  '@lapidist/design-lint/dtif-flattened-tokens',
);

/**
 * Attach flattened DTIF tokens to a token document for later reuse.
 *
 * The flattened tokens are stored on a non-enumerable symbol property so they
 * do not interfere with JSON serialisation or metadata inspection.
 */
export function attachDtifFlattenedTokens(
  target: object,
  tokens: readonly DtifFlattenedToken[],
): void {
  const existing = Object.getOwnPropertyDescriptor(
    target,
    DTIF_FLATTENED_TOKENS,
  );
  if (existing) {
    return;
  }
  Object.defineProperty(target, DTIF_FLATTENED_TOKENS, {
    value: tokens,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}

/**
 * Retrieve previously attached flattened DTIF tokens from a token document.
 */
export function getDtifFlattenedTokens(
  target: unknown,
): readonly DtifFlattenedToken[] | undefined {
  if (!target || typeof target !== 'object') {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(
    target,
    DTIF_FLATTENED_TOKENS,
  );
  const flattened: unknown = descriptor?.value;
  return isDtifFlattenedTokenArray(flattened) ? flattened : undefined;
}

export interface EnsureDtifOptions {
  uri?: string;
}

/**
 * Parse and attach flattened DTIF tokens to a document when none are cached.
 */
export async function ensureDtifFlattenedTokens(
  document: DesignTokens,
  options: EnsureDtifOptions = {},
): Promise<void> {
  if (getDtifFlattenedTokens(document)) {
    return;
  }

  const result = await parseDtifTokenObject(document, {
    uri: options.uri ?? 'memory://inline-config/default.json',
  });

  const hasErrors = result.diagnostics.some(
    (diagnostic) => diagnostic.severity === 'error',
  );

  if (!hasErrors) {
    attachDtifFlattenedTokens(document, result.tokens);
  }
}

function isDtifFlattenedTokenArray(
  value: unknown,
): value is readonly DtifFlattenedToken[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const pointer: unknown = Reflect.get(item, 'pointer');
    return typeof pointer === 'string';
  });
}
