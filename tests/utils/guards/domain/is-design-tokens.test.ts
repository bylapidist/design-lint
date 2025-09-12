/**
 * Unit tests for {@link isDesignTokens} domain guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { guards } from '../../../../src/utils/index.js';

const {
  domain: { isDesignTokens },
} = guards;

void test('isDesignTokens accepts records', () => {
  assert.equal(isDesignTokens({ foo: { $value: 'bar' } }), true);
});

void test('isDesignTokens rejects non-records', () => {
  assert.equal(isDesignTokens(null), false);
  assert.equal(isDesignTokens([]), false);
});
