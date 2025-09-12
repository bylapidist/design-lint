/**
 * Unit tests for {@link isStyleValue} AST guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { findStringLiteral } from '../../ast.js';
import { guards } from '../../../../src/utils/index.js';

const {
  ast: { isStyleValue },
} = guards;

void test('detects style values in JSX style attribute', () => {
  const node = findStringLiteral(`<div style={{ color: 'red' }} />`, 'red');
  assert.equal(isStyleValue(node), true);
});

void test('detects nested style properties', () => {
  const node = findStringLiteral(
    `<div style={{ background: { color: 'red' } }} />`,
    'red',
  );
  assert.equal(isStyleValue(node), true);
});

void test('detects style property nested under style attribute', () => {
  const node = findStringLiteral(
    `<div style={{ style: { color: 'red' } }} />`,
    'red',
  );
  assert.equal(isStyleValue(node), true);
});

void test('detects style prop in React.createElement', () => {
  const node = findStringLiteral(
    `React.createElement('div', { style: { color: 'red' } });`,
    'red',
  );
  assert.equal(isStyleValue(node), true);
});

void test('detects style prop in h()', () => {
  const node = findStringLiteral(
    `h('div', { style: { color: 'red' } });`,
    'red',
  );
  assert.equal(isStyleValue(node), true);
});

void test('ignores non-style contexts', () => {
  const importNode = findStringLiteral(`import x from 'red';`, 'red');
  assert.equal(isStyleValue(importNode), false);
  const varNode = findStringLiteral(`const x = 'red';`, 'red');
  assert.equal(isStyleValue(varNode), false);
  const attrNode = findStringLiteral(`<div data-test="red" />`, 'red');
  assert.equal(isStyleValue(attrNode), false);
  const callNode = findStringLiteral(`foo({ style: { color: 'red' } })`, 'red');
  assert.equal(isStyleValue(callNode), false);
  const objNode = findStringLiteral(
    `const obj = { style: { color: 'red' } };`,
    'red',
  );
  assert.equal(isStyleValue(objNode), false);
});

void test('detects string style attribute', () => {
  const node = findStringLiteral(`<div style="color: red" />`, 'color: red');
  assert.equal(isStyleValue(node), true);
});
