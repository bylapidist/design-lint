/**
 * @packageDocumentation
 *
 * Helpers for normalizing design token inputs into theme records.
 */
import type { DesignTokens } from '../../core/types.js';
import { isLikelyDtifDesignTokens } from '../../core/dtif/detect.js';
import { parseDtifDesignTokensObject } from '../../core/parser/index.js';
import { DTIF_MIGRATION_MESSAGE } from '../../core/dtif/messages.js';
import type {
  DtifParseSession,
  DtifSessionOptions,
} from '../../core/dtif/session.js';
import { isDesignTokens, isThemeRecord } from '../guards/domain/index.js';
import { parseTokensForTheme } from './parse-tokens-for-theme.js';
import { wrapTokenError } from './wrap-token-error.js';

export interface NormalizeDtifTokensOptions {
  readonly onWarn?: (message: string) => void;
  readonly session?: DtifParseSession;
  readonly sessionOptions?: DtifSessionOptions;
  readonly uri?: string | URL;
  readonly uriForTheme?: (theme: string) => string | URL;
}

function toThemeUri(theme: string): string {
  const slug = encodeURIComponent(theme || 'default');
  return `memory://design-lint/${slug}.tokens.json`;
}

async function ensureDtifDocument(
  theme: string,
  document: DesignTokens,
  uri: string | URL,
  options: NormalizeDtifTokensOptions,
): Promise<void> {
  if (!isLikelyDtifDesignTokens(document)) {
    throw wrapTokenError(theme, new Error(DTIF_MIGRATION_MESSAGE), 'parse');
  }

  try {
    await parseDtifDesignTokensObject(document, {
      uri,
      session: options.session,
      sessionOptions: options.sessionOptions,
      onWarn: options.onWarn,
    });
  } catch (error) {
    throw wrapTokenError(theme, error, 'parse');
  }
}

export async function normalizeDtifTokens(
  tokens: unknown,
  options: NormalizeDtifTokensOptions = {},
): Promise<Record<string, DesignTokens>> {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }

  if (isThemeRecord(tokens)) {
    for (const [theme, document] of Object.entries(tokens)) {
      if (theme.startsWith('$')) continue;
      const uri = options.uriForTheme?.(theme) ?? toThemeUri(theme);
      await ensureDtifDocument(theme, document, uri, options);
    }
    return tokens;
  }

  if (isDesignTokens(tokens)) {
    const uri = options.uri ?? 'memory://design-lint.tokens.json';
    await ensureDtifDocument('default', tokens, uri, options);
    return { default: tokens };
  }

  return {};
}

/**
 * Normalize DTIF design token inputs into a theme record.
 *
 * @remarks
 *   This helper now delegates to {@link normalizeDtifTokens} so only DTIF token
 *   documents are accepted. Legacy payloads will emit the shared DTIF
 *   migration message.
 */
export async function normalizeTokens(
  tokens: unknown,
): Promise<Record<string, DesignTokens>> {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }

  if (isThemeRecord(tokens)) {
    for (const [theme, document] of Object.entries(tokens)) {
      if (theme.startsWith('$')) continue;
      await parseTokensForTheme(theme, document);
    }
    return tokens;
  }

  if (isDesignTokens(tokens)) {
    await parseTokensForTheme('default', tokens);
    return { default: tokens };
  }

  return {};
}
