/**
 * Unit tests for the helpers module index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as helpers from '../../../src/formatters/helpers/index.js';

void test('helpers module exposes utilities', () => {
  assert.equal(typeof helpers.getFormatter, 'function');
  assert.equal(typeof helpers.resolveFormatter, 'function');
  assert.equal(typeof helpers.isFormatter, 'function');
  assert.equal(typeof helpers.isBuiltInFormatterName, 'function');
  assert.ok(Array.isArray(helpers.builtInFormatterNames));
  assert.equal(helpers.builtInFormatters instanceof Map, true);
});
