import type ts from 'typescript';
import type {
  CSSDeclaration,
  LintMessage,
  RegisteredRuleListener,
} from '../types.js';
import { RUNTIME_ERROR_RULE_ID } from '../cache-manager.js';

interface DispatchContext {
  listeners: RegisteredRuleListener[];
  messages: LintMessage[];
  sourceId: string;
  failedHooks: Set<string>;
}

export function dispatchNodeListener(
  context: DispatchContext,
  node: ts.Node,
  sourceFile: ts.SourceFile,
): void {
  const position = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  const line = position.line + 1;
  const column = position.character + 1;
  dispatch(context, 'onNode', line, column, (listener) =>
    listener.onNode?.(node),
  );
}

export function dispatchCSSDeclarationListener(
  context: DispatchContext,
  declaration: CSSDeclaration,
): void {
  dispatch(
    context,
    'onCSSDeclaration',
    declaration.line,
    declaration.column,
    (listener) => listener.onCSSDeclaration?.(declaration),
  );
}

function dispatch(
  context: DispatchContext,
  hook: 'onNode' | 'onCSSDeclaration',
  line: number,
  column: number,
  invoke: (listener: RegisteredRuleListener['listener']) => void,
): void {
  for (const registration of context.listeners) {
    const hookKey = `${registration.ruleId}:${hook}`;
    if (context.failedHooks.has(hookKey)) {
      continue;
    }
    try {
      invoke(registration.listener);
    } catch (error: unknown) {
      context.failedHooks.add(hookKey);
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Unknown listener error: ${String(error)}`;
      context.messages.push({
        ruleId: RUNTIME_ERROR_RULE_ID,
        message: `Rule "${registration.ruleId}" failed in ${hook}: ${errorMessage}`,
        severity: 'error',
        line,
        column,
        metadata: {
          phase: 'lint',
          sourceRule: registration.ruleId,
          sourceHook: hook,
          sourceId: context.sourceId,
          errorMessage,
        },
      });
    }
  }
}
