import { randomUUID } from 'node:crypto';
import type { Linter, LintDocument, LintMessage } from '@lapidist/design-lint';
import type {
  ComponentValidationResult,
  AEPDiagnostic,
  AepResponseMeta,
  MCPFileType,
} from '../types.js';

const AEP_VERSION = '1';
const KERNEL_SNAPSHOT_HASH = 'local';

function messageToAEPDiagnostic(msg: LintMessage): AEPDiagnostic {
  return {
    ruleId: msg.ruleId,
    severity: msg.severity,
    message: msg.message,
    line: msg.line,
    column: msg.column,
    rawValue: extractRawValue(msg),
    correction: extractCorrection(msg),
    suggestions: [],
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

export async function handleValidateComponent(
  linter: Linter,
  code: string,
  fileType: MCPFileType,
): Promise<ComponentValidationResult> {
  const snapshot = code;
  const doc: LintDocument = {
    id: `mcp-component.${fileType}`,
    type: fileType,
    getText: async () => snapshot,
  };

  const result = await linter.lintDocument(doc, false);

  const diagnostics: AEPDiagnostic[] = result.messages.map(messageToAEPDiagnostic);

  const meta: AepResponseMeta = {
    runId: randomUUID(),
    kernelSnapshotHash: KERNEL_SNAPSHOT_HASH,
    aepVersion: AEP_VERSION,
  };

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    meta,
  };
}
