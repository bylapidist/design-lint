/**
 * Unit tests for the stylish formatter index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as stylish from '../../../src/formatters/stylish/index.js';

void test('stylish formatter index exports stylishFormatter', () => {
  assert.equal(typeof stylish.stylishFormatter, 'function');
});
