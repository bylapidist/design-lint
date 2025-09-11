import {
  isSourceFile,
  isIdentifier,
  isJsxAttribute,
  isCallExpression,
  isPropertyAssignment,
  isPropertyAccessExpression,
  type Node,
} from 'typescript';

export function isStyleValue(node: Node): boolean {
  for (let curr: Node = node; !isSourceFile(curr); curr = curr.parent) {
    if (isJsxAttribute(curr)) {
      return curr.name.getText() === 'style';
    }
    if (isPropertyAssignment(curr) && curr.name.getText() === 'style') {
      for (let p: Node = curr.parent; !isSourceFile(p); p = p.parent) {
        if (isCallExpression(p)) {
          const expr = p.expression;
          if (
            (isPropertyAccessExpression(expr) &&
              expr.name.getText() === 'createElement' &&
              expr.expression.getText() === 'React') ||
            (isIdentifier(expr) && expr.text === 'h')
          ) {
            return true;
          }
        }
        if (isJsxAttribute(p) && p.name.getText() === 'style') {
          return true;
        }
      }
      return false;
    }
  }
  return false;
}
