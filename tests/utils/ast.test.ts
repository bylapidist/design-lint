/**
 * Unit tests for shared AST helper utilities.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getExpression,
  getStrings,
  findStringLiteral,
  getCallExpression,
} from './ast.js';
import {
  isCallExpression,
  isJsxSelfClosingElement,
  SyntaxKind,
} from 'typescript';

void test('getExpression parses expressions', () => {
  const expr = getExpression('<div />');
  assert.equal(isJsxSelfClosingElement(expr), true);
});

void test('getCallExpression returns call expressions', () => {
  const call = getCallExpression('foo()');
  assert.equal(isCallExpression(call), true);
});

void test('getCallExpression throws on non-call code', () => {
  assert.throws(() => getCallExpression('x'), /not call/);
});

void test('getStrings collects string literals', () => {
  const nodes = getStrings("['a', 'b', 'c']");
  assert.deepEqual(
    nodes.map((n) => n.text),
    ['a', 'b', 'c'],
  );
});

void test('findStringLiteral locates matching text', () => {
  const node = findStringLiteral("const x = 'needle';", 'needle');
  assert.equal(node.kind, SyntaxKind.StringLiteral);
});

void test('findStringLiteral throws when missing', () => {
  assert.throws(
    () => findStringLiteral("const x = 'needle';", 'haystack'),
    /String not found/,
  );
});
