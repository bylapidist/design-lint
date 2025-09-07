import ts from 'typescript';

export function isStyleValue(node: ts.Node): boolean {
  let curr: ts.Node | undefined = node;
  while (curr) {
    if (ts.isJsxAttribute(curr)) {
      return curr.name.getText() === 'style';
    }
    if (ts.isPropertyAssignment(curr) && curr.name.getText() === 'style') {
      let p: ts.Node | undefined = curr.parent;
      while (p) {
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
        p = p.parent as ts.Node | undefined;
      }
      return false;
    }
    curr = curr.parent as ts.Node | undefined;
  }
  return false;
}
