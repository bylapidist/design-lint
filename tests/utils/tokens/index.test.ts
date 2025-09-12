/**
 * Unit tests for the tokens utility index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as tokens from '../../../src/utils/tokens/index.js';

void test('tokens expose expected helpers', () => {
  assert.equal(typeof tokens.wrapTokenError, 'function');
  assert.equal(typeof tokens.parseTokensForTheme, 'function');
});
