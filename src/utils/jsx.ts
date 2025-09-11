import ts from 'typescript';

export function isInNonStyleJsx(node: ts.Node): boolean {
  for (
    let curr: ts.Node = node.parent;
    !ts.isSourceFile(curr);
    curr = curr.parent
  ) {
    if (ts.isJsxAttribute(curr)) {
      return curr.name.getText() !== 'style';
    }
    if (ts.isPropertyAssignment(curr)) {
      if (curr.name.getText() === 'style') return false;
      for (let p: ts.Node = curr.parent; !ts.isSourceFile(p); p = p.parent) {
        if (ts.isPropertyAssignment(p) && p.name.getText() === 'style') {
          return false;
        }
        if (
          ts.isJsxElement(p) ||
          ts.isJsxSelfClosingElement(p) ||
          ts.isJsxFragment(p)
        ) {
          return true;
        }
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
          break;
        }
      }
    }
    if (
      ts.isJsxElement(curr) ||
      ts.isJsxSelfClosingElement(curr) ||
      ts.isJsxFragment(curr)
    ) {
      return true;
    }
  }
  return false;
}
