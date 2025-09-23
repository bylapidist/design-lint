import {
  parseDtifTokensFromFile,
  type DtifParseResult,
  type ParseDtifTokensOptions,
} from '../../core/dtif/parse.js';
import { toLegacyFlattenedTokens } from '../../core/dtif/legacy-adapter.js';
import type {
  DesignTokens,
  FlattenedToken,
  TokenDiagnostic,
  TokenDocument,
} from '../../core/types.js';
import { attachDtifFlattenedTokens } from '../../utils/tokens/dtif-cache.js';

export interface ParseDesignTokensOptions extends ParseDtifTokensOptions {
  colorSpace?: 'rgb' | 'hsl' | 'hex';
  onWarn?: (msg: string) => void;
}

function assertSupportedFile(filePath: string): void {
  if (
    !(
      filePath.endsWith('.tokens') ||
      filePath.endsWith('.tokens.json') ||
      filePath.endsWith('.tokens.yaml') ||
      filePath.endsWith('.tokens.yml')
    )
  ) {
    throw new Error(`Unsupported design tokens file: ${filePath}`);
  }
}

export async function parseDesignTokensFile(
  filePath: string,
  options?: ParseDesignTokensOptions,
): Promise<FlattenedToken[]> {
  assertSupportedFile(filePath);
  const dtifOptions = toDtifOptions(options);
  const result = await parseDtifTokensFile(filePath, dtifOptions);
  return toLegacyFlattenedTokens(result.tokens);
}

export async function readDesignTokensFile(
  filePath: string,
  options?: ParseDesignTokensOptions,
): Promise<DesignTokens> {
  assertSupportedFile(filePath);
  const dtifOptions = toDtifOptions(options);
  const result = await parseDtifTokensFile(filePath, dtifOptions);
  const document = getTokenDocument(result, filePath);
  if (result.tokens.length > 0) {
    attachDtifFlattenedTokens(document, result.tokens);
  }
  return document;
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
  options?: ParseDtifTokensOptions,
): Promise<DtifParseResult> {
  const result = await parseDtifTokensFromFile(filePath, options);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new DtifTokenParseError(filePath, errors);
  }
  return result;
}

export async function readDtifTokensFile(
  filePath: string | URL,
  options?: ParseDtifTokensOptions,
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
    formatTokenDiagnostic(source, diagnostic),
  );
  return [header, ...details.map((line) => `  - ${line}`)].join('\n');
}

function formatTokenDiagnostic(
  defaultSource: string,
  diagnostic: TokenDiagnostic,
): string {
  const uri = diagnostic.location?.uri?.toString() ?? defaultSource;
  const span = diagnostic.location?.span;
  const position =
    span &&
    Number.isFinite(span.start.line) &&
    Number.isFinite(span.start.column)
      ? `${String(span.start.line)}:${String(span.start.column)}`
      : undefined;
  const pointer = diagnostic.pointer ? ` ${diagnostic.pointer}` : '';
  const severity = diagnostic.severity.toUpperCase();
  const prefix = position ? `${uri}:${position}` : uri;
  return `${prefix} ${severity}${pointer}: ${diagnostic.message}`;
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
  options?: ParseDesignTokensOptions,
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
