import test from 'node:test';
import assert from 'node:assert/strict';
import { toArray } from '../../src/utils/to-array.ts';

void test('toArray returns arrays unchanged', () => {
  const arr = [1, 2];
  assert.deepEqual(toArray(arr), arr);
});

void test('toArray wraps single values', () => {
  assert.deepEqual(toArray(1), [1]);
});
