/**
 * Unit tests for {@link isJsxLike} AST guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getExpression } from '../../ast.js';
import { guards } from '../../../../src/utils/index.js';

const {
  ast: { isJsxLike },
} = guards;

void test('isJsxLike detects JSX element', () => {
  const node = getExpression('<div></div>');
  assert.equal(isJsxLike(node), true);
});

void test('isJsxLike detects self-closing element', () => {
  const node = getExpression('<div />');
  assert.equal(isJsxLike(node), true);
});

void test('isJsxLike detects fragment', () => {
  const node = getExpression('<></>');
  assert.equal(isJsxLike(node), true);
});

void test('isJsxLike ignores non-JSX nodes', () => {
  const node = getExpression('42');
  assert.equal(isJsxLike(node), false);
});
