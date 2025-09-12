/**
 * Unit tests for the rules utility index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../../../src/utils/rules/index.js';

void test('rules export helpers', () => {
  assert.equal(typeof rules.tokenRule, 'function');
});
