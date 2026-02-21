import test from 'node:test';
import assert from 'node:assert/strict';
import { guards } from '../../../../src/utils/index.js';

const {
  data: { isFunction },
} = guards;

void test('isFunction detects functions', () => {
  assert.equal(
    isFunction(() => true),
    true,
  );
});

void test('isFunction rejects non-functions', () => {
  assert.equal(isFunction({}), false);
  assert.equal(isFunction(null), false);
});
