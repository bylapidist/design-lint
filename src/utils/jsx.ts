import ts from 'typescript';

export function isInNonStyleJsx(node: ts.Node): boolean {
  let curr: ts.Node | undefined = node.parent;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (curr) {
    if (ts.isJsxAttribute(curr)) {
      return curr.name.getText() !== 'style';
    }
    if (ts.isPropertyAssignment(curr)) {
      if (curr.name.getText() === 'style') return false;
      let p: ts.Node | undefined = curr.parent;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (p) {
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
        p = p.parent;
      }
    }
    if (
      ts.isJsxElement(curr) ||
      ts.isJsxSelfClosingElement(curr) ||
      ts.isJsxFragment(curr)
    ) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}
