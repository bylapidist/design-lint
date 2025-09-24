import {
  parseTokens,
  type ParseTokensInput,
  type ParseTokensOptions,
  type ParseTokensResult,
} from '@lapidist/dtif-parser';
import type { DtifFlattenedToken, TokenMetadata } from '../types.js';

export type ParseDtifTokensOptions = ParseTokensOptions;

export type ParseInlineDtifTokensOptions = ParseDtifTokensOptions & {
  uri?: string | URL;
};

export interface DtifParseResult {
  tokens: DtifFlattenedToken[];
  diagnostics: readonly import('@lapidist/dtif-parser').TokenDiagnostic[];
  document?: ParseTokensResult['document'];
  graph?: ParseTokensResult['graph'];
  resolver?: ParseTokensResult['resolver'];
}

export async function parseDtifTokens(
  input: ParseTokensInput,
  options: ParseDtifTokensOptions = {},
): Promise<DtifParseResult> {
  const result = await parseTokens(input, options);
  return normalizeParseResult(result);
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
  const contents =
    typeof content === 'string' ? content : new TextDecoder().decode(content);
  return parseDtifTokens(
    { contents, ...(uri ? { uri: toUriString(uri) } : {}) },
    parseOptions,
  );
}

export async function parseDtifTokenObject(
  document: unknown,
  options: ParseInlineDtifTokensOptions = {},
): Promise<DtifParseResult> {
  const { uri, ...parseOptions } = options;
  return parseDtifTokens(
    {
      contents: JSON.stringify(document),
      ...(uri ? { uri: toUriString(uri) } : {}),
    },
    parseOptions,
  );
}

function normalizeParseResult(result: ParseTokensResult): DtifParseResult {
  const tokens: DtifFlattenedToken[] = result.flattened.map((token) => ({
    ...token,
    metadata: ensureMetadata(result.metadataIndex.get(token.id), token),
    resolution: result.resolutionIndex.get(token.id),
  }));

  return {
    tokens,
    diagnostics: result.diagnostics,
    document: result.document,
    graph: result.graph,
    resolver: result.resolver,
  } satisfies DtifParseResult;
}

function ensureMetadata(
  metadata: TokenMetadata | undefined,
  token: { pointer: string },
): TokenMetadata {
  if (metadata) {
    return metadata;
  }

  return {
    description: undefined,
    extensions: {},
    source: {
      uri: token.pointer,
      line: 0,
      column: 0,
    },
  } satisfies TokenMetadata;
}

function toUriString(uri: string | URL): string {
  return typeof uri === 'string' ? uri : uri.toString();
}
