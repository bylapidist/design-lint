import { stat, writeFile } from 'node:fs/promises';
import type { CacheProvider } from './cache-provider.js';
import type { LintResult } from './types.js';
import type { LintDocument } from './environment.js';
import { applyFixes } from './apply-fixes.js';
import { guards } from '../utils/index.js';

export const RUNTIME_ERROR_RULE_ID = 'rule-execution-error';

export class CacheManager {
  constructor(
    private cache: CacheProvider | undefined,
    private fix: boolean,
  ) {}

  async processDocument(
    doc: LintDocument,
    lintFn: (
      text: string,
      sourceId: string,
      docType: string,
      metadata?: Record<string, unknown>,
    ) => Promise<LintResult>,
  ): Promise<LintResult> {
    let statResult;
    try {
      statResult = await stat(doc.id);
    } catch {
      statResult = undefined;
    }
    const cached = await this.cache?.get(doc.id);
    const cachedMtime = cached?.mtime;
    const cachedSize = cached?.size;
    const isCacheValid =
      !this.fix &&
      statResult != null &&
      cachedMtime === statResult.mtimeMs &&
      cachedSize === statResult.size;

    if (isCacheValid && cached) {
      return cached.result;
    }

    let text: string;
    try {
      text = await doc.getText();
    } catch (error: unknown) {
      return this.handleRuntimeError(doc.id, error, 'read');
    }

    try {
      let result = await lintFn(text, doc.id, doc.type, doc.metadata);
      let mtime = statResult?.mtimeMs ?? Date.now();
      let size = statResult?.size ?? text.length;
      if (this.fix && statResult) {
        const output = applyFixes(text, result.messages);
        if (output !== text) {
          await writeFile(doc.id, output, 'utf8');
          result = await lintFn(output, doc.id, doc.type, doc.metadata);
          const newStat = await stat(doc.id);
          mtime = newStat.mtimeMs;
          size = newStat.size;
        }
      }
      await this.cache?.set(doc.id, { mtime, size, result });
      return result;
    } catch (error: unknown) {
      return this.handleRuntimeError(doc.id, error, 'lint');
    }
  }

  async save(): Promise<void> {
    await this.cache?.save();
  }

  private async handleRuntimeError(
    sourceId: string,
    error: unknown,
    phase: 'read' | 'lint',
  ): Promise<LintResult> {
    await this.cache?.remove(sourceId);
    const { message, metadata } = buildErrorDetails(error, phase);
    return {
      sourceId,
      messages: [
        {
          ruleId: RUNTIME_ERROR_RULE_ID,
          message,
          severity: 'error',
          line: 1,
          column: 1,
          metadata,
        },
      ],
    };
  }
}

const {
  data: { isObject },
} = guards;

function buildErrorDetails(
  error: unknown,
  phase: 'read' | 'lint',
): { message: string; metadata: Record<string, unknown> } {
  const metadata: Record<string, unknown> = { phase };
  const fallbackMessage =
    phase === 'read'
      ? 'Failed to read source document'
      : 'Rule execution failed';

  const errorObject = isObject(error) ? error : undefined;
  const errorMessage = getStringProperty(errorObject, 'message');
  const errorStack = getStringProperty(errorObject, 'stack');
  const sourceRule = getSourceRule(errorObject);

  if (errorMessage) {
    metadata.errorMessage = errorMessage;
  }
  if (errorStack) {
    metadata.errorStack = errorStack.split('\n', 1)[0];
  }
  if (sourceRule) {
    metadata.sourceRule = sourceRule;
  }

  return {
    message: errorMessage ?? fallbackMessage,
    metadata,
  };
}

function getSourceRule(error: object | undefined): string | undefined {
  if (!error) {
    return undefined;
  }
  const ruleId = getStringProperty(error, 'ruleId');
  if (ruleId) return ruleId;

  const sourceRule = getStringProperty(error, 'sourceRule');
  if (sourceRule) return sourceRule;

  const ruleName = getStringProperty(error, 'ruleName');
  if (ruleName) return ruleName;

  return undefined;
}

function getStringProperty(
  target: object | undefined,
  key: string,
): string | undefined {
  if (!target || !(key in target)) {
    return undefined;
  }
  const value: unknown = Reflect.get(target, key);
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}
