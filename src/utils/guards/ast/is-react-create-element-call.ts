import {
  isCallExpression,
  isPropertyAccessExpression,
  type Node,
} from 'typescript';

/**
 * Determines if a node represents a `React.createElement(...)` call.
 *
 * This is useful for detecting React component creation in code that
 * doesn't use JSX syntax.
 *
 * @param n - The TypeScript AST node to check.
 * @returns `true` if the node is a call to `React.createElement`.
 */
export function isReactCreateElementCall(n: Node): boolean {
  if (!isCallExpression(n)) return false;
  if (!isPropertyAccessExpression(n.expression)) return false;
  if (n.expression.name.getText() !== 'createElement') return false;
  return n.expression.expression.getText() === 'React';
}
