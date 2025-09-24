import {
  parseDtifTokensFromFile,
  type DtifParseResult,
  type ParseDtifTokensOptions,
} from '../../core/dtif/parse.js';
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
  const errors = result.diagnostics.filter(
    (diagnostic): diagnostic is TokenDiagnostic =>
      diagnostic.severity === 'error',
  );
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
    formatTokenDiagnostic(source, diagnostic),
  );
  return [header, ...details.map((line) => `  - ${line}`)].join('\n');
}

function formatTokenDiagnostic(
  defaultSource: string,
  diagnostic: TokenDiagnostic,
): string {
  const uri = diagnostic.target.uri || defaultSource;
  const position = formatRangePosition(diagnostic.target.range);
  const severity = diagnostic.severity.toUpperCase();
  const prefix = position ? `${uri}:${position}` : uri;
  return `${prefix} ${severity}: ${diagnostic.message}`;
}

function formatRangePosition(
  range: TokenDiagnostic['target']['range'],
): string {
  const line = range.start.line;
  const character = range.start.character;
  const lineText = Number.isFinite(line) ? String(line + 1) : undefined;
  const columnText = Number.isFinite(character)
    ? String(character + 1)
    : undefined;
  if (lineText && columnText) {
    return `${lineText}:${columnText}`;
  }
  if (lineText) {
    return lineText;
  }
  return '';
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
  const { onWarn, warn, ...rest } = options;
  if (warn || onWarn) {
    return { ...rest, warn: warn ?? onWarn } satisfies ParseDtifTokensOptions;
  }
  return { ...rest } satisfies ParseDtifTokensOptions;
}
