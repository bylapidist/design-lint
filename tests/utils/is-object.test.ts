import test from 'node:test';
import assert from 'node:assert/strict';
import { guards } from '../../src/utils/index.js';

const {
  data: { isObject },
} = guards;

void test('isObject detects objects and arrays', () => {
  assert.equal(isObject({}), true);
  assert.equal(isObject([]), true);
});

void test('isObject rejects null and primitives', () => {
  assert.equal(isObject(null), false);
  assert.equal(isObject(42), false);
});
