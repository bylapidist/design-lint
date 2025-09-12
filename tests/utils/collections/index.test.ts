/**
 * Unit tests for the collections utility index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as collections from '../../../src/utils/collections/index.js';

void test('collections export array helpers', () => {
  assert.equal(typeof collections.isArray, 'function');
  assert.equal(typeof collections.toArray, 'function');
});
