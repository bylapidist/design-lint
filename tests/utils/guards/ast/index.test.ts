/**
 * Unit tests for the AST guard index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as astGuards from '../../../../src/utils/guards/ast/index.js';

void test('AST guards export expected functions', () => {
  assert.equal(typeof astGuards.isJsxLike, 'function');
  assert.equal(typeof astGuards.isInNonStyleJsx, 'function');
  assert.equal(typeof astGuards.isHyperscriptCall, 'function');
  assert.equal(typeof astGuards.isReactCreateElementCall, 'function');
  assert.equal(typeof astGuards.isStyleName, 'function');
  assert.equal(typeof astGuards.isStyleValue, 'function');
});
