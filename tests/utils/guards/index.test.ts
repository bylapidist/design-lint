/**
 * Unit tests for the guards utility index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as guards from '../../../src/utils/guards/index.js';

void test('guards expose grouped namespaces', () => {
  assert.equal(typeof guards.ast.isJsxLike, 'function');
  assert.equal(typeof guards.data.isObject, 'function');
  assert.equal(typeof guards.domain.isDesignTokens, 'function');
});

void test('guard members are directly exported', () => {
  assert.equal(typeof guards.isJsxLike, 'function');
  assert.equal(typeof guards.isObject, 'function');
  assert.equal(typeof guards.isDesignTokens, 'function');
});
