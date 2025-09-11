import { isCallExpression, isIdentifier, type Node } from 'typescript';

/**
 * Determines if a node represents a hyperscript `h(...)` call.
 *
 * Hyperscript is a JSX alternative used in some frameworks
 * (e.g. Preact, Vue render functions).
 *
 * @param n - The TypeScript AST node to check.
 * @returns `true` if the node is a call to `h(...)`.
 */
export const isHyperscriptCall = (n: Node): boolean =>
  isCallExpression(n) &&
  isIdentifier(n.expression) &&
  n.expression.text === 'h';
