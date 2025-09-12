/**
 * Unit tests for {@link isHyperscriptCall} AST guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getCallExpression, getExpression } from '../../ast.js';
import { guards } from '../../../../src/utils/index.js';

const {
  ast: { isHyperscriptCall },
} = guards;

void test('isHyperscriptCall detects h() calls', () => {
  const node = getCallExpression("h('div')");
  assert.equal(isHyperscriptCall(node), true);
});

void test('isHyperscriptCall ignores other calls', () => {
  const node = getCallExpression('foo()');
  assert.equal(isHyperscriptCall(node), false);
});

void test('isHyperscriptCall ignores non-call nodes', () => {
  const node = getExpression('x');
  assert.equal(isHyperscriptCall(node), false);
});
