import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { DesignTokens, FlattenedToken } from '../../core/types.js';
import { pointerToPath } from '../../core/dtif/flatten-tokens.js';
import { isLikelyDtifDesignTokens } from '../../core/dtif/detect.js';
import { DTIF_MIGRATION_MESSAGE } from '../../core/dtif/messages.js';
import type {
  DtifDiagnosticMessage,
  DtifDiagnosticRelatedInformation,
  DtifJsonPointer,
  DtifSourceLocation,
} from '../../core/dtif/session.js';
import { parseDtifDocument } from '../../core/dtif/document-parser.js';
import {
  parseDtifDesignTokens,
  DtifDesignTokenError,
  type ParseDesignTokensOptions,
  type ParseDtifDesignTokensOptions,
} from '../../core/parser/index.js';

export interface TokenParseErrorFromDtifOptions {
  readonly filePath?: string;
  readonly source?: string;
}

export class TokenParseError extends Error {
  filePath: string;
  line: number;
  column: number;
  lineText: string;

  constructor(
    filePath: string,
    line: number,
    column: number,
    message: string,
    lineText: string,
  ) {
    super(message);
    this.filePath = filePath;
    this.line = line;
    this.column = column;
    this.lineText = lineText;
  }

  format(): string {
    const loc = `${this.filePath}:${String(this.line)}:${String(this.column)}`;
    const caret = ' '.repeat(Math.max(0, this.column - 1)) + '^';
    return `${loc}: ${this.message}\n${this.lineText}\n${caret}`;
  }

  static fromDtifDiagnostic(
    diagnostic: DtifDiagnosticMessage,
    options: TokenParseErrorFromDtifOptions = {},
  ): TokenParseError {
    const line = diagnostic.location?.start.line ?? 1;
    const column = diagnostic.location?.start.column ?? 1;
    const filePath = resolveDiagnosticFilePath(diagnostic, options.filePath);
    const message = formatDtifDiagnosticMessage(diagnostic);
    const pointerText = formatDtifPointer(diagnostic.pointer);
    const sourceLine = extractSourceLine(options.source, line);
    const lineText = sourceLine.length > 0 ? sourceLine : (pointerText ?? '');
    return new TokenParseError(filePath, line, column, message, lineText);
  }
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

function resolveDiagnosticFilePath(
  diagnostic: DtifDiagnosticMessage,
  fallback?: string,
): string {
  if (fallback) {
    return fallback;
  }
  const uri = diagnostic.location?.uri;
  if (!uri) {
    return '<document>';
  }
  try {
    return fileURLToPath(uri);
  } catch {
    return uri;
  }
}

function formatDtifPointer(pointer?: DtifJsonPointer): string | undefined {
  if (!pointer) return undefined;
  const pathId = pointerToPath(pointer);
  if (pathId) {
    return `pointer ${pathId}`;
  }
  return pointer;
}

function formatDtifSourceLocation(location: DtifSourceLocation): string {
  const {
    uri,
    start: { line, column },
  } = location;
  return `${uri}:${String(line)}:${String(column)}`;
}

function formatDtifRelatedInformation(
  related: DtifDiagnosticRelatedInformation,
): string {
  const pointerText = formatDtifPointer(related.pointer);
  if (pointerText) {
    return `${pointerText}: ${related.message}`;
  }
  if (related.location) {
    return `${formatDtifSourceLocation(related.location)}: ${related.message}`;
  }
  return related.message;
}

function formatDtifDiagnosticMessage(
  diagnostic: DtifDiagnosticMessage,
): string {
  const pointerText = formatDtifPointer(diagnostic.pointer);
  const baseMessage = pointerText
    ? `${pointerText}: ${diagnostic.message}`
    : diagnostic.message;
  const relatedText = diagnostic.related
    ?.map((info) => formatDtifRelatedInformation(info))
    .join('; ');
  const withRelated =
    relatedText && relatedText.length > 0
      ? `${baseMessage} [related: ${relatedText}]`
      : baseMessage;
  return `${withRelated} (${diagnostic.code})`;
}

function extractSourceLine(source: string | undefined, line: number): string {
  if (!source || line < 1) {
    return '';
  }
  const lines = source.split(/\r?\n/);
  return lines[line - 1] ?? '';
}

function resolveContentType(
  filePath: string,
): 'application/json' | 'application/yaml' {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.yaml' || ext === '.yml'
    ? 'application/yaml'
    : 'application/json';
}

function createDtifParseInput(
  filePath: string,
  content: string,
): Parameters<typeof parseDtifDesignTokens>[0] {
  return {
    uri: pathToFileURL(filePath),
    content,
    contentType: resolveContentType(filePath),
  };
}

function isDesignTokens(value: unknown): value is DesignTokens {
  return typeof value === 'object' && value !== null;
}

export type ParseDesignTokensFileOptions = ParseDesignTokensOptions &
  ParseDtifDesignTokensOptions;

export async function parseDesignTokensFile(
  filePath: string,
  options?: ParseDesignTokensFileOptions,
): Promise<FlattenedToken[]> {
  return parseDtifDesignTokensFile(filePath, {
    colorSpace: options?.colorSpace,
    onWarn: options?.onWarn,
    session: options?.session,
    sessionOptions: options?.sessionOptions,
  });
}

export async function parseDtifDesignTokensFile(
  filePath: string,
  options?: ParseDtifDesignTokensOptions,
): Promise<FlattenedToken[]> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  const input = createDtifParseInput(filePath, content);

  try {
    return await parseDtifDesignTokens(input, options);
  } catch (error: unknown) {
    if (error instanceof DtifDesignTokenError && error.diagnostics.length > 0) {
      const diagnostic = error.diagnostics[0];
      throw TokenParseError.fromDtifDiagnostic(diagnostic, {
        filePath,
        source: content,
      });
    }
    throw error;
  }
}

export async function readDesignTokensFile(
  filePath: string,
  options?: ParseDesignTokensFileOptions,
): Promise<DesignTokens> {
  assertSupportedFile(filePath);
  const content = await readFile(filePath, 'utf8');
  const input = createDtifParseInput(filePath, content);
  const { result, diagnostics } = await parseDtifDocument(input, {
    session: options?.session,
    sessionOptions: options?.sessionOptions,
  });

  const document = result.document?.data;
  if (!isDesignTokens(document)) {
    throw new Error('DTIF document root must be an object');
  }

  if (!isLikelyDtifDesignTokens(document)) {
    throw new Error(DTIF_MIGRATION_MESSAGE);
  }

  const warnings = diagnostics.filter((diag) => diag.severity === 'warning');
  for (const warning of warnings) {
    options?.onWarn?.(formatDtifDiagnosticMessage(warning));
  }

  const errors = diagnostics.filter((diag) => diag.severity === 'error');
  if (errors.length > 0) {
    throw TokenParseError.fromDtifDiagnostic(errors[0], {
      filePath,
      source: content,
    });
  }

  return document;
}
