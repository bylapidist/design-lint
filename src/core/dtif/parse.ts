import type { ParseInput, ParseResult } from '@lapidist/dtif-parser';
import { createInlineParseInput, parseDtifDocument } from './session.js';
import {
  flattenDtifDocument,
  type FlattenDtifOptions,
  type FlattenDtifResult,
} from './flatten.js';
import type { InlineParseOptions } from './session.js';

export type ParseDtifTokensOptions = FlattenDtifOptions;

export type ParseInlineDtifTokensOptions = ParseDtifTokensOptions &
  InlineParseOptions;

export interface DtifParseResult extends FlattenDtifResult {
  document?: ParseResult['document'];
  graph?: ParseResult['graph'];
  resolver?: ParseResult['resolver'];
}

export async function parseDtifTokens(
  input: ParseInput,
  options: ParseDtifTokensOptions = {},
): Promise<DtifParseResult> {
  const parseResult = await parseDtifDocument(input);
  const flattened = flattenDtifDocument(parseResult, options);

  return {
    ...flattened,
    document: parseResult.document ?? undefined,
    graph: parseResult.graph ?? undefined,
    resolver: parseResult.resolver ?? undefined,
  } satisfies DtifParseResult;
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
  const { uri, contentType, ...parseOptions } = options;
  const record = createInlineParseInput(content, { uri, contentType });
  return parseDtifTokens(record, parseOptions);
}

export async function parseDtifTokenObject(
  document: unknown,
  options: ParseInlineDtifTokensOptions = {},
): Promise<DtifParseResult> {
  const { uri, contentType, ...parseOptions } = options;
  const content = JSON.stringify(document);
  const record = createInlineParseInput(content, { uri, contentType });
  return parseDtifTokens(record, parseOptions);
}
