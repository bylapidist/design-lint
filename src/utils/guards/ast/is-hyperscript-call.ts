import { isCallExpression, isIdentifier, type Node } from 'typescript';

/**
 * Determines if a node represents a hyperscript `h(...)` call.
 *
 * Hyperscript is a JSX alternative used in some frameworks
 * (e.g. Preact, Vue render functions).
 *
 * @example
 * ```ts
 * import ts from 'typescript';
 * const node = ts.factory.createCallExpression(
 *   ts.factory.createIdentifier('h'),
 *   undefined,
 *   [],
 * );
 * isHyperscriptCall(node); // => true
 * ```
 *
 * @param n - The TypeScript AST node to check.
 * @returns `true` if the node is a call to `h(...)`.
 */
export function isHyperscriptCall(n: Node): boolean {
  if (!isCallExpression(n)) return false;
  if (!isIdentifier(n.expression)) return false;
  return n.expression.text === 'h';
}
