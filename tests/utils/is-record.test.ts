import test from 'node:test';
import assert from 'node:assert/strict';
import { isRecord } from '../../src/utils/is-record.js';

void test('isRecord detects plain objects', () => {
  assert.equal(isRecord({ a: 1 }), true);
});

void test('isRecord rejects arrays and null', () => {
  assert.equal(isRecord([]), false);
  assert.equal(isRecord(null), false);
});
