import ts from 'typescript';

export function isStyleValue(node: ts.Node): boolean {
  for (let curr: ts.Node = node; !ts.isSourceFile(curr); curr = curr.parent) {
    if (ts.isJsxAttribute(curr)) {
      return curr.name.getText() === 'style';
    }
    if (ts.isPropertyAssignment(curr) && curr.name.getText() === 'style') {
      for (let p: ts.Node = curr.parent; !ts.isSourceFile(p); p = p.parent) {
        if (ts.isCallExpression(p)) {
          const expr = p.expression;
          if (
            (ts.isPropertyAccessExpression(expr) &&
              expr.name.getText() === 'createElement' &&
              expr.expression.getText() === 'React') ||
            (ts.isIdentifier(expr) && expr.text === 'h')
          ) {
            return true;
          }
        }
        if (ts.isJsxAttribute(p) && p.name.getText() === 'style') {
          return true;
        }
      }
      return false;
    }
  }
  return false;
}
