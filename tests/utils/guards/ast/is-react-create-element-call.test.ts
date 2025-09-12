/**
 * Unit tests for {@link isReactCreateElementCall} AST guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getCallExpression, getExpression } from '../../ast.js';
import { guards } from '../../../../src/utils/index.js';

const {
  ast: { isReactCreateElementCall },
} = guards;

void test('isReactCreateElementCall detects React.createElement', () => {
  const node = getCallExpression("React.createElement('div')");
  assert.equal(isReactCreateElementCall(node), true);
});

void test('isReactCreateElementCall ignores other calls', () => {
  const node = getCallExpression('foo()');
  assert.equal(isReactCreateElementCall(node), false);
});

void test('isReactCreateElementCall ignores non-call nodes', () => {
  const node = getExpression('React');
  assert.equal(isReactCreateElementCall(node), false);
});

void test('isReactCreateElementCall ignores other property accesses', () => {
  const node = getCallExpression('React.foo()');
  assert.equal(isReactCreateElementCall(node), false);
});

void test('isReactCreateElementCall ignores createElement on other objects', () => {
  const node = getCallExpression('Foo.createElement()');
  assert.equal(isReactCreateElementCall(node), false);
});
