import ts from 'typescript';
import type { CSSDeclaration, TokenReferenceCandidate } from '../types.js';

const CSS_VAR_PATTERN = /var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,[^)]+)?\)/g;
const BRACED_PATH_PATTERN = /\{\s*([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+)\s*\}/g;
const RAW_PATH_PATTERN = /\b([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+)\b/g;
const POINTER_PATTERN = /#\/[A-Za-z0-9_/-]+/g;

interface TokenReferenceExtractionOptions {
  includeRawPaths?: boolean;
}

function normalizePath(path: string): string {
  return path.trim().replace(/\s+/g, '');
}

function pushUniqueTokenReference(
  references: TokenReferenceCandidate[],
  reference: TokenReferenceCandidate,
): void {
  if (
    references.some(
      (candidate) =>
        candidate.kind === reference.kind &&
        candidate.identity === reference.identity &&
        candidate.context === reference.context &&
        candidate.line === reference.line &&
        candidate.column === reference.column,
    )
  ) {
    return;
  }
  references.push(reference);
}

export function collectTextTokenReferences(
  references: TokenReferenceCandidate[],
  text: string,
  line: number,
  column: number,
  context: string,
  options?: TokenReferenceExtractionOptions,
): void {
  for (const match of text.matchAll(CSS_VAR_PATTERN)) {
    const identity = match[1].trim();
    pushUniqueTokenReference(references, {
      kind: 'css-var',
      identity,
      line,
      column,
      context,
    });
  }

  for (const match of text.matchAll(BRACED_PATH_PATTERN)) {
    const identity = match[1] ? normalizePath(match[1]) : undefined;
    if (!identity) continue;
    pushUniqueTokenReference(references, {
      kind: 'token-path',
      identity,
      line,
      column,
      context,
    });
  }

  if (options?.includeRawPaths) {
    for (const match of text.matchAll(RAW_PATH_PATTERN)) {
      const identity = match[1] ? normalizePath(match[1]) : undefined;
      if (!identity) continue;
      pushUniqueTokenReference(references, {
        kind: 'token-path',
        identity,
        line,
        column,
        context,
      });
    }
  }

  for (const match of text.matchAll(POINTER_PATTERN)) {
    const identity = match[0].trim();
    pushUniqueTokenReference(references, {
      kind: 'alias-pointer',
      identity,
      line,
      column,
      context,
    });
  }
}

export function collectDeclarationTokenReferences(
  declaration: CSSDeclaration,
  references: TokenReferenceCandidate[],
  context = 'css-declaration',
): void {
  collectTextTokenReferences(
    references,
    declaration.prop,
    declaration.line,
    declaration.column,
    `${context}:property`,
  );
  collectTextTokenReferences(
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
    collectTextTokenReferences(
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
    collectTextTokenReferences(
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
    collectTextTokenReferences(
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
      collectTextTokenReferences(
        references,
        span.literal.text,
        literalStart.line + 1,
        literalStart.character + 1,
        `${contextPrefix}:template-span`,
      );
    }
  }
}
