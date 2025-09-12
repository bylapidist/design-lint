/**
 * Unit tests for {@link isFormatter} helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { helpers } from '../../../src/formatters/index.js';

const { isFormatter } = helpers;

void test('isFormatter detects functions', () => {
  assert.equal(
    isFormatter(() => ''),
    true,
  );
});

void test('isFormatter rejects non-functions', () => {
  assert.equal(isFormatter({}), false);
});
