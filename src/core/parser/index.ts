import type { DesignTokens, FlattenedToken } from '../types.js';
import { parseDtifDocument } from '../dtif/document-parser.js';
import {
  flattenResolvedTokens,
  pointerToPath,
} from '../dtif/flatten-tokens.js';
import type {
  DtifDiagnosticMessage,
  DtifParseInput,
  DtifParseSession,
  DtifSessionOptions,
} from '../dtif/session.js';
import { normalizeColorValues, type ColorSpace } from './normalize-colors.js';

export type TokenTransform = (
  tokens: Record<string, unknown>,
) => Record<string, unknown>;

const tokenTransformRegistry: TokenTransform[] = [];

function applyTokenTransforms(
  tokens: DesignTokens,
  extraTransforms?: readonly TokenTransform[],
): DesignTokens;
function applyTokenTransforms(
  tokens: Record<string, unknown>,
  extraTransforms?: readonly TokenTransform[],
): Record<string, unknown>;
function applyTokenTransforms(
  tokens: Record<string, unknown>,
  extraTransforms?: readonly TokenTransform[],
): Record<string, unknown> {
  let transformed = tokens;
  const transforms = [...tokenTransformRegistry, ...(extraTransforms ?? [])];
  for (const transform of transforms) {
    transformed = transform(transformed);
  }
  return transformed;
}

export function registerTokenTransform(transform: TokenTransform): () => void {
  tokenTransformRegistry.push(transform);
  return () => {
    const idx = tokenTransformRegistry.indexOf(transform);
    if (idx >= 0) tokenTransformRegistry.splice(idx, 1);
  };
}

export {
  getFlattenedTokenLocation as getTokenLocation,
  getFlattenedTokenLocation as getDtifTokenLocation,
} from '../dtif/flatten-tokens.js';

export interface ParseDesignTokensOptions {
  readonly colorSpace?: ColorSpace;
  readonly transforms?: readonly TokenTransform[];
  readonly onWarn?: (msg: string) => void;
  readonly uri?: string | URL;
  readonly session?: DtifParseSession;
  readonly sessionOptions?: DtifSessionOptions;
}

export async function parseDesignTokens(
  tokens: DesignTokens,
  _getLoc?: (path: string) => { line: number; column: number },
  options: ParseDesignTokensOptions = {},
): Promise<FlattenedToken[]> {
  const transformed = applyTokenTransforms(tokens, options.transforms);
  const { colorSpace, onWarn, session, sessionOptions, uri } = options;
  return parseDtifDesignTokensObject(transformed, {
    colorSpace,
    onWarn,
    session,
    sessionOptions,
    uri,
  });
}

export interface ParseDtifDesignTokensOptions {
  readonly colorSpace?: ColorSpace;
  readonly onWarn?: (message: string) => void;
  readonly session?: DtifParseSession;
  readonly sessionOptions?: DtifSessionOptions;
}

export interface ParseDtifDesignTokensObjectOptions
  extends ParseDtifDesignTokensOptions {
  readonly uri?: string | URL;
  readonly transforms?: readonly TokenTransform[];
}

export class DtifDesignTokenError extends Error {
  readonly diagnostics: readonly DtifDiagnosticMessage[];

  constructor(diagnostics: readonly DtifDiagnosticMessage[]) {
    super(formatDtifDiagnosticSummary(diagnostics));
    this.name = 'DtifDesignTokenError';
    this.diagnostics = diagnostics;
  }
}

export async function parseDtifDesignTokens(
  input: DtifParseInput,
  options: ParseDtifDesignTokensOptions = {},
): Promise<FlattenedToken[]> {
  const { session, sessionOptions, colorSpace, onWarn } = options;

  const { tokens, diagnostics } = await parseDtifDocument(input, {
    session,
    sessionOptions,
  });

  const warnings = diagnostics.filter((diag) => diag.severity === 'warning');
  for (const warning of warnings) {
    onWarn?.(formatDtifDiagnostic(warning));
  }

  const errors = diagnostics.filter((diag) => diag.severity === 'error');
  if (errors.length > 0) {
    throw new DtifDesignTokenError(errors);
  }

  const flattened = flattenResolvedTokens(tokens);
  if (colorSpace) {
    normalizeColorValues(flattened, colorSpace);
  }
  return flattened;
}

export async function parseDtifDesignTokensObject(
  document: unknown,
  options: ParseDtifDesignTokensObjectOptions = {},
): Promise<FlattenedToken[]> {
  if (!isRecord(document)) {
    throw new TypeError('DTIF design tokens must be provided as an object');
  }

  const { uri, transforms, ...rest } = options;

  let content: string;
  try {
    const transformed = applyTokenTransforms(document, transforms);
    content = JSON.stringify(transformed, null, 2);
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';
    throw new Error(
      `Failed to serialize DTIF design tokens for parsing: ${reason}`,
    );
  }

  const input: DtifParseInput = {
    uri: uri ?? 'memory://design-lint.tokens.json',
    contentType: 'application/json',
    content,
  };

  return parseDtifDesignTokens(input, rest);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatDtifDiagnosticSummary(
  diagnostics: readonly DtifDiagnosticMessage[],
): string {
  const details = diagnostics.map(formatDtifDiagnostic).join('\n');
  return `Failed to parse DTIF design tokens:\n${details}`;
}

function formatDtifDiagnostic(diagnostic: DtifDiagnosticMessage): string {
  const location = formatDtifDiagnosticLocation(diagnostic);
  return `${location}: ${diagnostic.message} (${diagnostic.code})`;
}

function formatDtifDiagnosticLocation(
  diagnostic: DtifDiagnosticMessage,
): string {
  if (diagnostic.location) {
    const {
      uri,
      start: { line, column },
    } = diagnostic.location;
    return `${uri}:${String(line)}:${String(column)}`;
  }
  if (diagnostic.pointer !== undefined) {
    const path = pointerToPath(diagnostic.pointer);
    return path ? `pointer ${path}` : diagnostic.pointer;
  }
  return '<document>';
}
