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
 * @example
 * ```tsx
 * const element = <div style={{ color: 'red' }} title="a" />;
 * // Given a reference to the value of the `color` property:
 * isStyleValue(colorValueNode); // => true
 * // Given a reference to the value of `title`:
 * isStyleValue(titleValueNode); // => false
 * ```
 *
 * @param node - The TypeScript AST node to check.
 * @returns `true` if the node is a style value, `false` otherwise.
 */
export function isStyleValue(node: Node): boolean {
  // Climb from the current node up to the root of the AST in search of a
  // surrounding style context.
  for (let curr: Node = node; !isSourceFile(curr); curr = curr.parent) {
    // If we reached a JSX attribute, the value belongs to that attribute. Only
    // consider it a style value when the attribute name is exactly "style".
    if (isJsxAttribute(curr)) return isStyleName(curr.name);

    // Handle object property assignments like `{ style: { ... } }`.
    if (isPropertyAssignment(curr) && isStyleName(curr.name)) {
      // Examine ancestors of the object property to find the surrounding JSX or
      // createElement/hyperscript call that would indicate a style context.
      for (let p: Node = curr.parent; !isSourceFile(p); p = p.parent) {
        if (isCallExpression(p)) {
          // A React.createElement or hyperscript h() call signals that we're
          // inside a JSX-like factory where the property is indeed a style.
          if (isReactCreateElementCall(p) || isHyperscriptCall(p)) return true;
          // Any other function call isn't relevant to styles; abort this path.
          break;
        }
        // A parent JSX attribute named "style" also confirms the context.
        if (isJsxAttribute(p) && isStyleName(p.name)) return true;
      }
      // Exhausted all ancestors without finding a style context.
      return false;
    }
  }
  return false;
}
