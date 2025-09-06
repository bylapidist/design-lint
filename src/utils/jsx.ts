import ts from 'typescript';

export function isInNonStyleJsx(node: ts.Node): boolean {
  let inJsx = false;
  for (let curr = node.parent; curr; curr = curr.parent) {
    if (ts.isJsxAttribute(curr)) {
      return curr.name.getText() !== 'style';
    }
    if (
      ts.isJsxElement(curr) ||
      ts.isJsxSelfClosingElement(curr) ||
      ts.isJsxFragment(curr)
    ) {
      inJsx = true;
    }
  }
  return inJsx;
}
