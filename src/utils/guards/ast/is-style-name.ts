import type { Node } from 'typescript';

/**
 * Checks if a node represents a property or attribute named `style`.
 *
 * @example
 * ```ts
 * import ts from 'typescript';
 * const prop = ts.factory.createIdentifier('style');
 * isStyleName(prop); // => true
 * ```
 *
 * @param n - The TypeScript AST node to check.
 * @returns `true` if the node's text is exactly "style", `false` otherwise.
 */
export const isStyleName = (n: Node): boolean => n.getText() === 'style';
