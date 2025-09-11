import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSourceFile,
  forEachChild,
  isStringLiteral,
  ScriptKind,
  ScriptTarget,
  type Node,
  type StringLiteral,
} from 'typescript';
import { isStyleValue } from '../src/utils/style.js';

function getStringNode(code: string, text: string): StringLiteral {
  const sf = createSourceFile(
    'file.tsx',
    code,
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  );
  let found: StringLiteral | undefined;
  const visit = (node: Node) => {
    if (isStringLiteral(node) && node.text === text) {
      found = node;
    }
    forEachChild(node, visit);
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
