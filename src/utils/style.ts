import {
  isSourceFile,
  isJsxAttribute,
  isCallExpression,
  isPropertyAssignment,
  type Node,
} from 'typescript';
import { isStyleName } from './is-style-name.js';
import { isReactCreateElementCall } from './is-react-create-element-call.js';
import { isHyperscriptCall } from './is-hyperscript-call.js';

/**
 * Determines whether a node's value belongs to a `style` attribute or `style`
 * property within JSX or JSX-like code (e.g., `React.createElement` or
 * hyperscript `h()` calls).
 *
 * The function walks up the AST from the provided node:
 * - If it encounters a JSX attribute, it returns whether that attribute is
 *   named `style`.
 * - If it encounters a property assignment named `style`, it searches further
 *   up the tree for a surrounding JSX attribute, `React.createElement` call, or
 *   hyperscript call.
 * - Returns `false` otherwise.
 *
 * @param node - The TypeScript AST node to check.
 * @returns `true` if the node is a style value, `false` otherwise.
 */
export function isStyleValue(node: Node): boolean {
  for (let curr: Node = node; !isSourceFile(curr); curr = curr.parent) {
    if (isJsxAttribute(curr)) return isStyleName(curr.name);

    if (isPropertyAssignment(curr) && isStyleName(curr.name)) {
      for (let p: Node = curr.parent; !isSourceFile(p); p = p.parent) {
        if (isCallExpression(p)) {
          if (isReactCreateElementCall(p) || isHyperscriptCall(p)) return true;
          break;
        }
        if (isJsxAttribute(p) && isStyleName(p.name)) return true;
      }
      return false;
    }
  }
  return false;
}
