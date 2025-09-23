import {
  createSession,
  type ContentType,
  type Diagnostic,
  type ParseInput,
  type ParseInputRecord,
  type ParseResult,
  type ParseSession,
  type SourceSpan,
} from '@lapidist/dtif-parser';
import type {
  JsonPointer,
  TokenDiagnostic,
  TokenDiagnosticRelated,
  TokenLocation,
} from '../types.js';

const DEFAULT_SESSION_OPTIONS = Object.freeze({
  allowHttp: false,
  maxDepth: 32,
});

const DEFAULT_CONTENT_TYPE: ContentType = 'application/json';

const sharedSession = createSession(DEFAULT_SESSION_OPTIONS);

export interface InlineParseOptions {
  uri?: string | URL;
  contentType?: ContentType;
}

export function getDtifSession(): ParseSession {
  return sharedSession;
}

export function createInlineParseInput(
  content: string | Uint8Array,
  options: InlineParseOptions = {},
): ParseInputRecord {
  return {
    ...(options.uri ? { uri: options.uri } : {}),
    content,
    contentType: options.contentType ?? DEFAULT_CONTENT_TYPE,
  } satisfies ParseInputRecord;
}

export function parseDtifDocument(input: ParseInput): Promise<ParseResult> {
  return sharedSession.parseDocument(input);
}

export function parseDtifFile(path: string | URL): Promise<ParseResult> {
  return parseDtifDocument(path);
}

export function parseInlineDocument(
  record: ParseInputRecord,
): Promise<ParseResult> {
  return parseDtifDocument(record);
}

export function createTokenLocation(
  pointer: JsonPointer | undefined,
  span: SourceSpan | undefined,
): TokenLocation | undefined {
  if (!pointer && !span) {
    return undefined;
  }
  return {
    pointer,
    span,
    uri: span?.uri,
  };
}

export function toTokenDiagnostic(diagnostic: Diagnostic): TokenDiagnostic {
  const related = diagnostic.related?.map(
    (info): TokenDiagnosticRelated => ({
      message: info.message,
      pointer: info.pointer,
      location: createTokenLocation(info.pointer, info.span),
    }),
  );

  return {
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    pointer: diagnostic.pointer,
    location: createTokenLocation(diagnostic.pointer, diagnostic.span),
    related: related && related.length > 0 ? related : undefined,
  };
}

export function collectTokenDiagnostics(
  diagnostics: Iterable<Diagnostic>,
): TokenDiagnostic[] {
  const formatted: TokenDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    formatted.push(toTokenDiagnostic(diagnostic));
  }
  return formatted;
}
