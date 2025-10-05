import type {
  ParseDataInputRecord,
  ParseInput,
  ParseInputRecord,
  ResolvedTokenView,
  TokenMetadataSnapshot,
  TokenPointer as ParserTokenPointer,
  RawDocument as ParserRawDocument,
  SourceMap as ParserSourceMap,
  SourceSpan as ParserSourceSpan,
  Diagnostic as ParserDiagnostic,
  RelatedInformation as ParserRelatedInformation,
} from '@lapidist/dtif-parser';
import {
  parseTokens,
  type ParseTokensInput,
  type ParseTokensOptions,
  type ParseTokensResult,
} from '@lapidist/dtif-parser/parse-tokens';
import type { DesignTokenInterchangeFormat } from '@lapidist/dtif-schema';
import type {
  DtifFlattenedToken,
  TokenDeprecation,
  TokenDiagnostic,
  TokenDiagnosticRelatedInformation,
  TokenDiagnosticTarget,
  TokenMetadata,
  TokenRange,
  TokenPointer,
  TokenResolution,
} from '../types.js';

type TokenDiagnosticRelated = TokenDiagnosticRelatedInformation;

export type ParseDtifTokensOptions = ParseTokensOptions;

export interface ParseInlineDtifTokensOptions extends ParseDtifTokensOptions {
  uri?: string;
}

export interface DtifParseResult {
  tokens: DtifFlattenedToken[];
  diagnostics: readonly TokenDiagnostic[];
  document?: ParseTokensResult['document'];
  graph?: ParseTokensResult['graph'];
  resolver?: ParseTokensResult['resolver'];
  metadataIndex: ReadonlyMap<string, TokenMetadata>;
  resolutionIndex: ReadonlyMap<string, TokenResolution>;
}

export async function parseDtifTokens(
  input: ParseInput | ParseTokensInput,
  options: ParseDtifTokensOptions = {},
): Promise<DtifParseResult> {
  const result = await parseTokens(input, options);
  return toDtifParseResult(result);
}

export async function parseDtifTokensFromFile(
  path: string | URL,
  options: ParseDtifTokensOptions = {},
): Promise<DtifParseResult> {
  return parseDtifTokens(path, options);
}

export async function parseInlineDtifTokens(
  content: string | Uint8Array,
  options: ParseInlineDtifTokensOptions = {},
): Promise<DtifParseResult> {
  const { uri, ...parseOptions } = options;
  const record: ParseInputRecord = {
    ...(uri ? { uri } : {}),
    content,
  };
  return parseDtifTokens(record, parseOptions);
}

export async function parseDtifTokenObject(
  document: DesignTokenInterchangeFormat,
  options: ParseInlineDtifTokensOptions = {},
): Promise<DtifParseResult> {
  const { uri, ...parseOptions } = options;
  const input: ParseDataInputRecord = {
    ...(uri ? { uri } : {}),
    data: document,
  };
  return parseDtifTokens(input, parseOptions);
}

function toDtifParseResult(result: ParseTokensResult): DtifParseResult {
  const metadataIndex = new Map<string, TokenMetadata>();
  for (const [id, snapshot] of result.metadataIndex) {
    metadataIndex.set(id, toTokenMetadata(snapshot));
  }

  const resolutionIndex = new Map<string, TokenResolution>();
  for (const [id, view] of result.resolutionIndex) {
    const resolution = toTokenResolution(view);
    if (resolution) {
      resolutionIndex.set(id, resolution);
    }
  }

  const document = result.document;

  const tokens: DtifFlattenedToken[] = result.flattened.map((token) => ({
    id: token.id,
    pointer: token.pointer,
    path: token.path,
    name: token.name,
    type: token.type,
    value: token.value,
    raw: token.raw,
    metadata: metadataIndex.get(token.id) ?? createEmptyMetadata(),
    resolution: resolutionIndex.get(token.id),
  }));

  return {
    tokens,
    diagnostics: result.diagnostics.map((diagnostic) =>
      toTokenDiagnostic(diagnostic, document),
    ),
    document,
    graph: result.graph,
    resolver: result.resolver,
    metadataIndex,
    resolutionIndex,
  } satisfies DtifParseResult;
}

function toTokenMetadata(snapshot: TokenMetadataSnapshot): TokenMetadata {
  const metadata: TokenMetadata = {
    extensions: cloneExtensions(snapshot.extensions),
  };

  if (snapshot.description !== undefined) {
    metadata.description = snapshot.description;
  }

  if (snapshot.deprecated) {
    metadata.deprecated = toTokenDeprecation(snapshot.deprecated);
  }

  metadata.source = { ...snapshot.source };

  return metadata;
}

function createEmptyMetadata(): TokenMetadata {
  return { extensions: {} };
}

function cloneExtensions(
  extensions: Record<string, unknown>,
): Record<string, unknown> {
  return { ...extensions };
}

function toTokenDeprecation(
  snapshot: NonNullable<TokenMetadataSnapshot['deprecated']>,
): TokenDeprecation {
  return {
    since: snapshot.since,
    reason: snapshot.reason,
    supersededBy: snapshot.supersededBy
      ? clonePointer(snapshot.supersededBy)
      : undefined,
  } satisfies TokenDeprecation;
}

function toTokenResolution(
  view: ResolvedTokenView | undefined,
): TokenResolution | undefined {
  if (!view) {
    return undefined;
  }

  return {
    id: view.id,
    type: view.type,
    value: view.value,
    raw: view.raw,
    references: view.references.map(clonePointer),
    resolutionPath: view.resolutionPath.map(clonePointer),
    appliedAliases: view.appliedAliases.map(clonePointer),
  } satisfies TokenResolution;
}

function clonePointer(pointer: ParserTokenPointer): TokenPointer {
  return { uri: pointer.uri, pointer: pointer.pointer } satisfies TokenPointer;
}

function toTokenDiagnostic(
  diagnostic: ParserDiagnostic,
  document: ParserRawDocument | undefined,
): TokenDiagnostic {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    source: 'dtif-parser',
    target: toTokenDiagnosticTarget(diagnostic, document),
    related: diagnostic.related?.map((entry) =>
      toTokenDiagnosticRelated(entry, document),
    ),
  } satisfies TokenDiagnostic;
}

function toTokenDiagnosticRelated(
  entry: ParserRelatedInformation,
  document: ParserRawDocument | undefined,
): TokenDiagnosticRelated {
  return {
    message: entry.message,
    target: toTokenDiagnosticTarget(entry, document),
  } satisfies TokenDiagnosticRelated;
}

type DiagnosticLike =
  | Pick<ParserDiagnostic, 'pointer' | 'span'>
  | Pick<ParserRelatedInformation, 'pointer' | 'span'>;

function toTokenDiagnosticTarget(
  diagnostic: DiagnosticLike,
  document: ParserRawDocument | undefined,
): TokenDiagnosticTarget {
  const span = resolveDiagnosticSpan(
    diagnostic,
    document ? document.sourceMap : undefined,
  );
  const uri = span
    ? span.uri.toString()
    : document
      ? document.identity.uri.toString()
      : '';

  return {
    uri,
    range: span ? toTokenRange(span) : undefined,
    pointer: diagnostic.pointer,
  } satisfies TokenDiagnosticTarget;
}

function resolveDiagnosticSpan(
  diagnostic: DiagnosticLike,
  sourceMap: ParserSourceMap | undefined,
): ParserSourceSpan | undefined {
  if (diagnostic.span) {
    return diagnostic.span;
  }

  if (!diagnostic.pointer || !sourceMap) {
    return undefined;
  }

  return sourceMap.pointers.get(diagnostic.pointer);
}

function toTokenRange(span: ParserSourceSpan): TokenRange {
  return {
    start: {
      line: span.start.line,
      character: span.start.column,
    },
    end: {
      line: span.end.line,
      character: span.end.column,
    },
  } satisfies TokenRange;
}
