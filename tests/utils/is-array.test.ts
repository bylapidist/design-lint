import test from 'node:test';
import assert from 'node:assert/strict';
import { isArray } from '../../src/utils/is-array.js';

void test('isArray detects arrays', () => {
  assert.equal(isArray([]), true);
  assert.equal(isArray([1, 2, 3]), true);
});

void test('isArray rejects non-arrays', () => {
  assert.equal(isArray({}), false);
  assert.equal(isArray('foo'), false);
});
