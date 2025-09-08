import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { isStyleValue } from '../packages/core/src/utils/style.ts';

function getStringNode(code: string, text: string): ts.StringLiteral {
  const sf = ts.createSourceFile(
    'file.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found: ts.StringLiteral | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) && node.text === text) {
      found = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!found) throw new Error('String not found');
  return found;
}

void test('detects style values in JSX style attribute', () => {
  const node = getStringNode(`<div style={{ color: 'red' }} />`, 'red');
  assert.equal(isStyleValue(node), true);
});

void test('detects nested style properties', () => {
  const node = getStringNode(
    `<div style={{ background: { color: 'red' } }} />`,
    'red',
  );
  assert.equal(isStyleValue(node), true);
});

void test('detects style prop in React.createElement', () => {
  const node = getStringNode(
    `React.createElement('div', { style: { color: 'red' } });`,
    'red',
  );
  assert.equal(isStyleValue(node), true);
});

void test('detects style prop in h()', () => {
  const node = getStringNode(`h('div', { style: { color: 'red' } });`, 'red');
  assert.equal(isStyleValue(node), true);
});

void test('ignores non-style contexts', () => {
  const importNode = getStringNode(`import x from 'red';`, 'red');
  assert.equal(isStyleValue(importNode), false);
  const varNode = getStringNode(`const x = 'red';`, 'red');
  assert.equal(isStyleValue(varNode), false);
  const attrNode = getStringNode(`<div data-test="red" />`, 'red');
  assert.equal(isStyleValue(attrNode), false);
});

void test('detects string style attribute', () => {
  const node = getStringNode(`<div style="color: red" />`, 'color: red');
  assert.equal(isStyleValue(node), true);
});
