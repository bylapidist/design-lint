/**
 * Unit tests for {@link isFormatter} helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isFormatter } from '../../../src/formatters/get-formatter/index.js';

void test('isFormatter detects functions', () => {
  assert.equal(
    isFormatter(() => ''),
    true,
  );
});

void test('isFormatter rejects non-functions', () => {
  assert.equal(isFormatter({}), false);
});
