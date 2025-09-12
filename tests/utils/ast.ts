/**
 * Shared AST utilities for design-lint tests.
 */
import {
  createSourceFile,
  forEachChild,
  isCallExpression,
  isExpressionStatement,
  isStringLiteral,
  ScriptKind,
  ScriptTarget,
  type CallExpression,
  type Expression,
  type ExpressionStatement,
  type Node,
  type SourceFile,
  type StringLiteral,
} from 'typescript';

/**
 * Parses TSX code into a {@link SourceFile} for further analysis.
 *
 * @param code - The TypeScript or TSX snippet to parse.
 * @returns The generated {@link SourceFile} AST.
 */
function parse(code: string): SourceFile {
  return createSourceFile(
    'x.tsx',
    code,
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  );
}

/**
 * Parses a snippet of TypeScript or TSX code and returns the first call expression.
 *
 * @param code - Source code expected to contain a call expression as its first statement.
 * @returns The extracted {@link CallExpression} node.
 * @throws If the code does not contain a call expression.
 */
export function getCallExpression(code: string): CallExpression {
  const stmt = parse(code).statements[0] as ExpressionStatement;
  const expr = stmt.expression;
  if (!isCallExpression(expr)) throw new Error('not call');
  return expr;
}

/**
 * Parses TSX code and returns the first expression statement's expression.
 *
 * @param code - TSX snippet expected to contain an expression statement.
 * @returns The extracted {@link Expression} node.
 * @throws If the snippet does not start with an expression statement.
 */
export function getExpression(code: string): Expression {
  const stmt = parse(code).statements[0];
  if (!isExpressionStatement(stmt)) throw new Error('not expression');
  return stmt.expression;
}

/**
 * Extracts all string literal nodes from a snippet of TSX code.
 *
 * @param code - Source code to search.
 * @returns An array of {@link StringLiteral} nodes in lexical order.
 */
export function getStrings(code: string): StringLiteral[] {
  const sf = parse(code);
  const nodes: StringLiteral[] = [];
  const walk = (node: Node): void => {
    if (isStringLiteral(node)) nodes.push(node);
    forEachChild(node, walk);
  };
  walk(sf);
  return nodes;
}

/**
 * Finds the first string literal with matching text within a TSX snippet.
 *
 * @param code - Source code to parse.
 * @param text - Text content to search for.
 * @returns The matching {@link StringLiteral} node.
 * @throws If no matching string literal is found.
 */
export function findStringLiteral(code: string, text: string): StringLiteral {
  const match = getStrings(code).find((s) => s.text === text);
  if (!match) throw new Error('String not found');
  return match;
}
