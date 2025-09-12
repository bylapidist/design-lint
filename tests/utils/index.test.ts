/**
 * Unit tests for the top-level utilities entry point.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../../src/utils/index.js';

void test('utils expose grouped namespaces', () => {
  assert.deepEqual(Object.keys(utils).sort(), [
    'collections',
    'color',
    'guards',
    'rules',
    'tokens',
  ]);
});

void test('namespace members are accessible', () => {
  assert.equal(typeof utils.collections.isArray, 'function');
  assert.equal(typeof utils.collections.toArray, 'function');
  assert.equal(typeof utils.color.detectColorFormat, 'function');
  assert.equal(utils.color.namedColors instanceof Set, true);
  assert.equal(typeof utils.guards.ast.isJsxLike, 'function');
  assert.equal(typeof utils.rules.tokenRule, 'function');
  assert.equal(typeof utils.tokens.wrapTokenError, 'function');
  assert.equal(typeof utils.tokens.parseTokensForTheme, 'function');
  assert.equal(typeof utils.tokens.normalizeTokens, 'function');
});
