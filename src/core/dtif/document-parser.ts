import {
  createDtifSession,
  diagnosticsToMessages,
  type DtifDiagnosticMessage,
  type DtifParseInput,
  type DtifParseResult,
  type DtifParseSession,
  type DtifSessionOptions,
} from './session.js';
import { resolveDocumentTokens } from './resolve-tokens.js';
import type { ResolvedTokenView } from '../types.js';

export interface ParseDtifDocumentOptions {
  readonly session?: DtifParseSession;
  readonly sessionOptions?: DtifSessionOptions;
}

export interface ParseDtifDocumentResult {
  readonly result: DtifParseResult;
  readonly tokens: readonly ResolvedTokenView[];
  readonly parseDiagnostics: readonly DtifDiagnosticMessage[];
  readonly resolutionDiagnostics: readonly DtifDiagnosticMessage[];
  readonly diagnostics: readonly DtifDiagnosticMessage[];
}

export async function parseDtifDocument(
  input: DtifParseInput,
  options: ParseDtifDocumentOptions = {},
): Promise<ParseDtifDocumentResult> {
  const session = options.session ?? createDtifSession(options.sessionOptions);
  const result = await session.parse(input);
  const parseDiagnostics = diagnosticsToMessages(result.diagnostics);
  const { tokens, resolutionDiagnostics } = resolveDocumentTokens(result);
  return {
    result,
    tokens,
    parseDiagnostics,
    resolutionDiagnostics,
    diagnostics: [...parseDiagnostics, ...resolutionDiagnostics],
  } satisfies ParseDtifDocumentResult;
}
