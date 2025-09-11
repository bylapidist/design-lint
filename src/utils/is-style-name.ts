import type { Node } from 'typescript';

/**
 * Checks if a node represents a property or attribute named `style`.
 *
 * @param n - The TypeScript AST node to check.
 * @returns `true` if the node's text is exactly "style", `false` otherwise.
 */
export const isStyleName = (n: Node) => n.getText() === 'style';
