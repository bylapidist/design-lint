/**
 * Unit tests for the isTokenGroup guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isTokenGroup } from '../../../../src/utils/guards/domain/is-token-group.js';

void test('isTokenGroup validates nested token groups', () => {
  const group = { color: { red: { $value: '#f00' } } };
  assert.equal(isTokenGroup(group), true);
  assert.equal(isTokenGroup({ $value: '#f00' }), false);
  assert.equal(isTokenGroup({ foo: 1 }), false);
});
