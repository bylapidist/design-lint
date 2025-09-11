import test from 'node:test';
import assert from 'node:assert/strict';
import { isObject } from '../../src/utils/is-object.ts';

void test('isObject detects objects and arrays', () => {
  assert.equal(isObject({}), true);
  assert.equal(isObject([]), true);
});

void test('isObject rejects null and primitives', () => {
  assert.equal(isObject(null), false);
  assert.equal(isObject(42), false);
});
