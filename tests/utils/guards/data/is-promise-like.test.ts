import test from 'node:test';
import assert from 'node:assert/strict';
import { guards } from '../../../../src/utils/index.js';

const {
  data: { isPromiseLike },
} = guards;

void test('isPromiseLike detects thenables', () => {
  const thenable = {
    then: () => undefined,
  };
  assert.equal(isPromiseLike(thenable), true);
});

void test('isPromiseLike rejects non-thenables', () => {
  assert.equal(isPromiseLike({}), false);
  assert.equal(isPromiseLike(null), false);
});
