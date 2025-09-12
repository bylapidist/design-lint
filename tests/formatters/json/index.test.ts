/**
 * Unit tests for the JSON formatter index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as json from '../../../src/formatters/json/index.js';

void test('json formatter index exports jsonFormatter', () => {
  assert.equal(typeof json.jsonFormatter, 'function');
});
