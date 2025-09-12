/**
 * Unit tests for the isToken guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isToken } from '../../../../src/utils/guards/domain/is-token.js';

void test('isToken identifies token objects', () => {
  assert.equal(isToken({ $value: '#fff' }), true);
  assert.equal(isToken({}), false);
  assert.equal(isToken(null), false);
});
