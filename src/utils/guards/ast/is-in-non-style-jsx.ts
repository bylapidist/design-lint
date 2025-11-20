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

function isNodeLike(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'kind' in value;
}

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
 * @example
 * ```tsx
 * const element = <div title="a" style={{ color: 'red' }} />;
 * // Given a reference to the `title` attribute node:
 * isInNonStyleJsx(titleNode); // => true
 * // For the `color` property inside the style object:
 * isInNonStyleJsx(colorProp); // => false
 * ```
 *
 * @param node - The TypeScript AST node to start from.
 * @returns `true` if the node is inside non-style JSX (or JSX-like code), `false` otherwise.
 */
export function isInNonStyleJsx(node: Node): boolean {
  const maybeStart = Reflect.get(node, 'parent');
  const start = isNodeLike(maybeStart) ? maybeStart : undefined;

  for (let curr = start; curr; curr = curr.parent) {
    if (isSourceFile(curr)) break;

    // Check if we're in a JSX attribute: e.g., <div style={...} />
    // If it's a style attribute, return false (we are inside inline styles)
    if (isJsxAttribute(curr)) return !isStyleName(curr.name);

    // Check if we're in an object property assignment: e.g., { style: ... }
    if (isPropertyAssignment(curr)) {
      // If the property key is "style", return false (inside a style object)
      if (isStyleName(curr.name)) return false;

      // Climb further up to see if this object lives inside JSX or createElement/h() calls
      const innerMaybe = Reflect.get(curr, 'parent');
      const innerStart = isNodeLike(innerMaybe) ? innerMaybe : undefined;

      for (let parent = innerStart; parent; parent = parent.parent) {
        if (!isNodeLike(parent)) break;
        if (isSourceFile(parent)) break;

        const currentParent: Node = parent;

        // If we hit another property named "style" higher up, we're still inside styles -> exclude
        if (isPropertyAssignment(currentParent) && isStyleName(currentParent.name)) return false;

        // If we find JSX (element, self-closing, or fragment), confirm we're in JSX -> include
        if (isJsxLike(currentParent)) return true;

        // If we encounter a function call, check if it's React.createElement or h()
        if (isCallExpression(currentParent)) {
          // React.createElement(...) or h(...) means JSX-like context -> include
          if (isReactCreateElementCall(currentParent) || isHyperscriptCall(currentParent)) return true;

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
