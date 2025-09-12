/**
 * Unit tests for the data guard index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as dataGuards from '../../../../src/utils/guards/data/index.js';

void test('data guards export structure guards', () => {
  assert.equal(typeof dataGuards.isObject, 'function');
  assert.equal(typeof dataGuards.isRecord, 'function');
});
