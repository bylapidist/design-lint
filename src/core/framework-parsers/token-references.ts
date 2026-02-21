import ts from 'typescript';
import type { CSSDeclaration, TokenReferenceCandidate } from '../types.js';

export function pushTokenReference(
  references: TokenReferenceCandidate[],
  candidate: string,
  line: number,
  column: number,
  context: string,
): void {
  const normalized = candidate.trim();
  if (!normalized) return;
  references.push({ candidate: normalized, line, column, context });
}

export function collectDeclarationTokenReferences(
  declaration: CSSDeclaration,
  references: TokenReferenceCandidate[],
  context = 'css-declaration',
): void {
  pushTokenReference(
    references,
    declaration.prop,
    declaration.line,
    declaration.column,
    `${context}:property`,
  );
  pushTokenReference(
    references,
    declaration.value,
    declaration.line,
    declaration.column,
    `${context}:value`,
  );
}

export function collectTsTokenReferences(
  node: ts.Node,
  source: ts.SourceFile,
  references: TokenReferenceCandidate[],
  contextPrefix = 'ts',
): void {
  if (ts.isStringLiteral(node)) {
    const start = source.getLineAndCharacterOfPosition(
      node.getStart(source) + 1,
    );
    pushTokenReference(
      references,
      node.text,
      start.line + 1,
      start.character + 1,
      `${contextPrefix}:string`,
    );
    return;
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    const start = source.getLineAndCharacterOfPosition(
      node.getStart(source) + 1,
    );
    pushTokenReference(
      references,
      node.text,
      start.line + 1,
      start.character + 1,
      `${contextPrefix}:template`,
    );
    return;
  }
  if (ts.isTemplateExpression(node)) {
    const headStart = source.getLineAndCharacterOfPosition(
      node.head.getStart(source) + 1,
    );
    pushTokenReference(
      references,
      node.head.text,
      headStart.line + 1,
      headStart.character + 1,
      `${contextPrefix}:template-head`,
    );
    for (const span of node.templateSpans) {
      const literalStart = source.getLineAndCharacterOfPosition(
        span.literal.getStart(source) + 1,
      );
      pushTokenReference(
        references,
        span.literal.text,
        literalStart.line + 1,
        literalStart.character + 1,
        `${contextPrefix}:template-span`,
      );
    }
  }
}
