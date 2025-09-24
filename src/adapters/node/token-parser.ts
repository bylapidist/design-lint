import {
  parseDtifTokensFromFile,
  type DtifParseResult,
  type ParseDtifTokensOptions,
} from '../../core/dtif/parse.js';
import { formatTokenDiagnostic as formatParserTokenDiagnostic } from '@lapidist/dtif-parser';
import type { TokenDiagnostic, TokenDocument } from '../../core/types.js';
import { attachDtifFlattenedTokens } from '../../utils/tokens/dtif-cache.js';

export interface NodeParseTokensOptions extends ParseDtifTokensOptions {
  onWarn?: (diagnostic: TokenDiagnostic) => void;
}

function assertSupportedFile(filePath: string | URL): void {
  const source = String(filePath);
  if (
    !(
      source.endsWith('.tokens') ||
      source.endsWith('.tokens.json') ||
      source.endsWith('.tokens.yaml') ||
      source.endsWith('.tokens.yml')
    )
  ) {
    throw new Error(`Unsupported design tokens file: ${source}`);
  }
}

export class DtifTokenParseError extends Error {
  readonly diagnostics: readonly TokenDiagnostic[];
  readonly source: string;

  constructor(source: string | URL, diagnostics: readonly TokenDiagnostic[]) {
    const sourceText = toSourceString(source);
    super(createDtifErrorMessage(sourceText, diagnostics));
    this.name = 'DtifTokenParseError';
    this.diagnostics = diagnostics;
    this.source = sourceText;
  }

  format(): string {
    return this.message;
  }
}

export async function parseDtifTokensFile(
  filePath: string | URL,
  options?: NodeParseTokensOptions,
): Promise<DtifParseResult> {
  assertSupportedFile(filePath);
  const dtifOptions = toDtifOptions(options);
  const result = await parseDtifTokensFromFile(filePath, dtifOptions);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new DtifTokenParseError(filePath, errors);
  }
  return result;
}

export async function readDtifTokensFile(
  filePath: string | URL,
  options?: NodeParseTokensOptions,
): Promise<TokenDocument> {
  const result = await parseDtifTokensFile(filePath, options);
  const document = getTokenDocument(result, filePath);
  if (result.tokens.length > 0) {
    attachDtifFlattenedTokens(document, result.tokens);
  }
  return document;
}

function getTokenDocument(
  result: DtifParseResult,
  source: string | URL,
): TokenDocument {
  const document = result.document;
  if (!document) {
    throw new Error(
      `DTIF parser did not return a document for ${toSourceString(source)}`,
    );
  }
  const data = document.data;
  assertIsTokenDocument(data, document.uri.toString());
  return data;
}

function toSourceString(source: string | URL): string {
  return typeof source === 'string' ? source : source.toString();
}

function createDtifErrorMessage(
  source: string,
  diagnostics: readonly TokenDiagnostic[],
): string {
  const header = `Failed to parse DTIF document: ${source}`;
  const details = diagnostics.map((diagnostic) =>
    formatParserTokenDiagnostic(diagnostic, { color: false }),
  );
  return [header, ...details.map((line) => `  - ${line}`)].join('\n');
}

function assertIsTokenDocument(
  value: unknown,
  source: string,
): asserts value is TokenDocument {
  if (!isTokenDocument(value)) {
    throw new Error(
      `DTIF parser returned unexpected document contents for ${source}`,
    );
  }
}

function isTokenDocument(value: unknown): value is TokenDocument {
  return typeof value === 'object' && value !== null;
}

function toDtifOptions(
  options?: NodeParseTokensOptions,
): ParseDtifTokensOptions | undefined {
  if (!options) return undefined;
  const dtifOptions: ParseDtifTokensOptions = {};
  if (options.onDiagnostic) {
    dtifOptions.onDiagnostic = options.onDiagnostic;
  }
  const warn = options.warn ?? options.onWarn;
  if (warn) {
    dtifOptions.warn = warn;
  }
  return dtifOptions;
}
