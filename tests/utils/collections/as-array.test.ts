/**
 * Unit tests for {@link asArray} collection utility.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { collections } from '../../../src/utils/index.js';

const { asArray } = collections;

void test('asArray returns array values as copies', () => {
  const values = ['a', 'b'];
  const result = asArray(values);
  assert.deepEqual(result, values);
  assert.notEqual(result, values);
});

void test('asArray returns empty array for non-array values', () => {
  assert.deepEqual(asArray('value'), []);
  assert.deepEqual(asArray(undefined), []);
});
