import {
  isSourceFile,
  isJsxAttribute,
  isCallExpression,
  isPropertyAssignment,
  type Node,
} from 'typescript';
import { isJsxLike } from './is-jsx-like.js';
import { isStyleName } from './is-style-name.js';
import { isReactCreateElementCall } from './is-react-create-element-call.js';
import { isHyperscriptCall } from './is-hyperscript-call.js';

/**
 * Determines whether a given TypeScript AST node is inside JSX (or JSX-like code)
 * and **not** within a `style` attribute or `style` property assignment.
 *
 * This is useful for rules where we need to differentiate between inline style
 * definitions and other JSX usage.
 *
 * The function:
 * - Walks up the AST from the given node.
 * - Returns `false` if it finds a `style` attribute or `style` property.
 * - Returns `true` if it detects the node is inside JSX, a React `createElement` call,
 *   or a `h()` hyperscript call. Otherwise, returns `false`.
 *
 * @param node - The TypeScript AST node to start from.
 * @returns `true` if the node is inside non-style JSX (or JSX-like code), `false` otherwise.
 */
export function isInNonStyleJsx(node: Node): boolean {
  // Walk up the AST starting from the node's parent until we reach the SourceFile (top of the AST)
  for (let curr: Node = node.parent; !isSourceFile(curr); curr = curr.parent) {
    // Check if we're in a JSX attribute: e.g., <div style={...} />
    // If it's a style attribute, return false (we are inside inline styles)
    if (isJsxAttribute(curr)) return !isStyleName(curr.name);

    // Check if we're in an object property assignment: e.g., { style: ... }
    if (isPropertyAssignment(curr)) {
      // If the property key is "style", return false (inside a style object)
      if (isStyleName(curr.name)) return false;

      // Climb further up to see if this object lives inside JSX or createElement/h() calls
      for (let p: Node = curr.parent; !isSourceFile(p); p = p.parent) {
        // If we hit another property named "style" higher up, we're still inside styles -> exclude
        if (isPropertyAssignment(p) && isStyleName(p.name)) return false;

        // If we find JSX (element, self-closing, or fragment), confirm we're in JSX -> include
        if (isJsxLike(p)) return true;

        // If we encounter a function call, check if it's React.createElement or h()
        if (isCallExpression(p)) {
          // React.createElement(...) or h(...) means JSX-like context -> include
          if (isReactCreateElementCall(p) || isHyperscriptCall(p)) return true;

          // Any other call expression isn't JSX-related, stop climbing here
          break;
        }
      }
    }

    // If we directly encounter JSX (without style properties), include it
    if (isJsxLike(curr)) return true;
  }

  // If we reached here, we never found JSX or JSX-like code outside of styles
  return false;
}
