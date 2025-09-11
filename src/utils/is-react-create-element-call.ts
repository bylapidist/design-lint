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
export const isReactCreateElementCall = (n: Node) =>
  isCallExpression(n) &&
  isPropertyAccessExpression(n.expression) &&
  n.expression.name.getText() === 'createElement' &&
  n.expression.expression.getText() === 'React';
