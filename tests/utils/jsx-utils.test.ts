import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { isInNonStyleJsx } from '../../src/utils/jsx.ts';

function getStrings(code: string): ts.StringLiteral[] {
  const sf = ts.createSourceFile(
    'x.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const nodes: ts.StringLiteral[] = [];
  const walk = (node: ts.Node) => {
    if (ts.isStringLiteral(node)) nodes.push(node);
    ts.forEachChild(node, walk);
  };
  walk(sf);
  return nodes;
}

test('isInNonStyleJsx handles React.createElement props', () => {
  const [, title, color] = getStrings(
    "React.createElement('div', { title: 'foo', style: { color: 'bar' } })",
  );
  assert.equal(isInNonStyleJsx(title), true);
  assert.equal(isInNonStyleJsx(color), false);
});

test('isInNonStyleJsx handles h() props', () => {
  const [, title, color] = getStrings(
    "h('div', { title: 'foo', style: { color: 'bar' } })",
  );
  assert.equal(isInNonStyleJsx(title), true);
  assert.equal(isInNonStyleJsx(color), false);
});
