import {
  DefaultDocumentLoader,
  InMemoryDocumentCache,
  createSession,
  type DiagnosticBag,
  type Diagnostic,
  type DiagnosticCode,
  type DiagnosticSeverity,
  type DocumentAst,
  type DocumentCache,
  type DocumentGraph,
  type DocumentLoader,
  type DocumentResolver,
  type ExtensionEvaluation,
  type InMemoryDocumentCacheOptions,
  type JsonPointer,
  type OverrideContext,
  type ParseInput,
  type ParseResult,
  type ParseSession,
  type ParseSessionOptions,
  type ParserPlugin,
  type RawDocument,
  type RelatedInformation,
  type ResolvedToken,
  type SchemaGuard,
  type SchemaGuardOptions,
  type SourceSpan,
} from '@lapidist/dtif-parser';

export const DEFAULT_DTIF_MAX_DEPTH = 32;

const DEFAULT_CACHE_OPTIONS: InMemoryDocumentCacheOptions = {
  maxAgeMs: 60_000,
  maxEntries: 128,
};

export type DtifParseInput = ParseInput;
export type DtifDocumentAst = DocumentAst;
export type DtifDocumentGraph = DocumentGraph;
export type DtifRawDocument = RawDocument;
export type DtifDocumentResolver = DocumentResolver;
export type DtifDiagnosticBag = DiagnosticBag;
export type DtifDiagnosticCode = DiagnosticCode;
export type DtifDiagnosticSeverity = DiagnosticSeverity;
export type DtifJsonPointer = JsonPointer;
export type DtifResolvedToken = ResolvedToken;

export interface DtifSessionOptions {
  readonly loader?: DocumentLoader;
  readonly cache?: DocumentCache;
  readonly cacheOptions?: InMemoryDocumentCacheOptions;
  readonly allowHttp?: boolean;
  readonly maxDepth?: number;
  readonly overrideContext?: OverrideContext;
  readonly schemaGuard?: SchemaGuard | SchemaGuardOptions;
  readonly plugins?: readonly ParserPlugin[];
}

export interface DtifParseResult {
  readonly document?: DtifRawDocument;
  readonly ast?: DtifDocumentAst;
  readonly graph?: DtifDocumentGraph;
  readonly resolver?: DtifDocumentResolver;
  readonly diagnostics: DtifDiagnosticBag;
  readonly extensions: readonly ExtensionEvaluation[];
}

export interface DtifParseSession {
  parse(input: DtifParseInput): Promise<DtifParseResult>;
  getSession(): ParseSession;
}

export interface DtifSourcePosition {
  readonly line: number;
  readonly column: number;
}

export interface DtifSourceLocation {
  readonly uri: string;
  readonly start: DtifSourcePosition;
  readonly end: DtifSourcePosition;
}

export interface DtifDiagnosticRelatedInformation {
  readonly message: string;
  readonly pointer?: DtifJsonPointer;
  readonly location?: DtifSourceLocation;
}

export interface DtifDiagnosticMessage {
  readonly code: DtifDiagnosticCode;
  readonly message: string;
  readonly severity: DtifDiagnosticSeverity;
  readonly pointer?: DtifJsonPointer;
  readonly location?: DtifSourceLocation;
  readonly related?: readonly DtifDiagnosticRelatedInformation[];
}

export type DtifDiagnostic = Diagnostic;

export function createDtifSession(
  options: DtifSessionOptions = {},
): DtifParseSession {
  const cache =
    options.cache ??
    new InMemoryDocumentCache({
      ...DEFAULT_CACHE_OPTIONS,
      ...options.cacheOptions,
    });

  const loader =
    options.loader ??
    new DefaultDocumentLoader({
      allowHttp: options.allowHttp ?? false,
    });

  const sessionOptions: ParseSessionOptions = {
    loader,
    cache,
    allowHttp: options.allowHttp ?? false,
    maxDepth: options.maxDepth ?? DEFAULT_DTIF_MAX_DEPTH,
    overrideContext: options.overrideContext,
    schemaGuard: options.schemaGuard,
    plugins: options.plugins,
  };

  let session: ParseSession | undefined;

  function ensureSession(): ParseSession {
    session ??= createSession(sessionOptions);
    return session;
  }

  async function parse(input: DtifParseInput): Promise<DtifParseResult> {
    const result = await ensureSession().parseDocument(input);
    return mapParseResult(result);
  }

  return {
    parse,
    getSession: ensureSession,
  };
}

export function diagnosticsToMessages(
  diagnostics: DtifDiagnosticBag,
): DtifDiagnosticMessage[] {
  return diagnostics.toArray().map(diagnosticToMessage);
}

export function diagnosticsArrayToMessages(
  diagnostics: readonly Diagnostic[],
): DtifDiagnosticMessage[] {
  if (diagnostics.length === 0) return [];
  return diagnostics.map(diagnosticToMessage);
}

export function toSourceLocation(
  span?: SourceSpan,
): DtifSourceLocation | undefined {
  if (!span) return undefined;
  return {
    uri: span.uri.href,
    start: {
      line: span.start.line,
      column: span.start.column,
    },
    end: {
      line: span.end.line,
      column: span.end.column,
    },
  } satisfies DtifSourceLocation;
}

function diagnosticToMessage(diagnostic: Diagnostic): DtifDiagnosticMessage {
  return {
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    pointer: diagnostic.pointer,
    location: toSourceLocation(diagnostic.span),
    related: mapRelatedInformation(diagnostic.related),
  } satisfies DtifDiagnosticMessage;
}

function mapParseResult(result: ParseResult): DtifParseResult {
  return {
    document: result.document,
    ast: result.ast,
    graph: result.graph,
    resolver: result.resolver,
    diagnostics: result.diagnostics,
    extensions: result.extensions ?? [],
  };
}

function mapRelatedInformation(
  related?: readonly RelatedInformation[],
): readonly DtifDiagnosticRelatedInformation[] | undefined {
  if (!related || related.length === 0) return undefined;
  return related.map((info) => ({
    message: info.message,
    pointer: info.pointer,
    location: toSourceLocation(info.span),
  }));
}
