import test from 'node:test';
import assert from 'node:assert/strict';
import { isDesignTokens } from '../../src/utils/is-design-tokens.js';

void test('isDesignTokens accepts records', () => {
  assert.equal(isDesignTokens({ foo: { $value: 'bar' } }), true);
});

void test('isDesignTokens rejects non-records', () => {
  assert.equal(isDesignTokens(null), false);
  assert.equal(isDesignTokens([]), false);
});
