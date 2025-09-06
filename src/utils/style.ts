import ts from 'typescript';

export function isStyleValue(node: ts.Node): boolean {
  let curr: ts.Node | undefined = node;
  while (curr && !ts.isPropertyAssignment(curr)) {
    curr = curr.parent;
  }
  if (!curr || !ts.isPropertyAssignment(curr)) return false;
  let parent: ts.Node | undefined = curr.parent;
  while (parent) {
    if (ts.isJsxAttribute(parent)) {
      return parent.name.getText() === 'style';
    }
    if (ts.isPropertyAssignment(parent) && parent.name.getText() === 'style') {
      let p: ts.Node | undefined = parent.parent;
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
        p = p.parent;
      }
      return false;
    }
    parent = parent.parent;
  }
  return false;
}
