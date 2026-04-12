import type { Linter, LintDocument, LintMessage } from '@lapidist/design-lint';
import { applyFixes } from '@lapidist/design-lint';
import type {
  LintSnippetParams,
  GenerationResult,
  AEPDiagnostic,
  RankedCorrection,
} from '../types.js';

const AEP_VERSION = '1';
const DEFAULT_ITERATION_DEPTH = 3;

function messageToAEPDiagnostic(
  msg: LintMessage,
  agentId: string | undefined,
): AEPDiagnostic {
  const suggestions: RankedCorrection[] = [];
  return {
    ruleId: msg.ruleId,
    severity: msg.severity,
    message: msg.message,
    line: msg.line,
    column: msg.column,
    rawValue: extractRawValue(msg),
    correction: extractCorrection(msg),
    suggestions,
    agentId,
    aepVersion: AEP_VERSION,
  };
}

function extractRawValue(msg: LintMessage): string {
  if (!msg.metadata) return '';
  const raw = msg.metadata['rawValue'];
  return typeof raw === 'string' ? raw : '';
}

function extractCorrection(msg: LintMessage): string | null {
  return msg.fix?.text ?? null;
}

export async function handleLintSnippet(
  linter: Linter,
  params: LintSnippetParams,
): Promise<GenerationResult> {
  const { code, fileType, agentId, iterationDepth = DEFAULT_ITERATION_DEPTH } =
    params;

  let current = code;
  let iterationsUsed = 0;
  let converged = false;
  let lastMessages: LintMessage[] = [];

  while (iterationsUsed < iterationDepth) {
    const snapshot = current;
    const doc: LintDocument = {
      id: `mcp-snippet.${fileType}`,
      type: fileType,
      getText: async () => snapshot,
    };
    const result = await linter.lintDocument(doc, false);
    lastMessages = result.messages;

    if (lastMessages.length === 0) {
      converged = true;
      break;
    }

    const fixed = applyFixes(current, lastMessages);
    iterationsUsed++;

    if (fixed === current) {
      // No more automatic fixes available; return to caller
      break;
    }
    current = fixed;
  }

  if (!converged && lastMessages.length === 0) {
    converged = true;
  }

  const diagnostics: AEPDiagnostic[] = lastMessages.map((msg) =>
    messageToAEPDiagnostic(msg, agentId),
  );

  return {
    diagnostics,
    correctedSnippet: current,
    converged,
    iterationsUsed,
    violationsRemaining: lastMessages.length,
  };
}
