import {
  isJsxElement,
  isJsxSelfClosingElement,
  isJsxFragment,
  type Node,
} from 'typescript';

/**
 * Determines whether a node is any JSX-like construct.
 *
 * Specifically checks for:
 * - JSX elements (`<div>...</div>`)
 * - JSX self-closing elements (`<div />`)
 * - JSX fragments (`<>...</>`)
 *
 * @param n - The TypeScript AST node to check.
 * @returns `true` if the node is JSX-like, `false` otherwise.
 */
export const isJsxLike = (n: Node) =>
  isJsxElement(n) || isJsxSelfClosingElement(n) || isJsxFragment(n);
