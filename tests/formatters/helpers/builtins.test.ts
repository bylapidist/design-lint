/**
 * Unit tests for built-in formatter mappings.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  helpers,
  jsonFormatter,
  sarifFormatter,
  stylishFormatter,
} from '../../../src/formatters/index.js';

const {
  builtInFormatters,
  builtInFormatterNames,
  isBuiltInFormatterName,
  builtins,
} = helpers;

void test('builtInFormatters exposes bundled formatters', () => {
  assert.equal(builtInFormatters.get('json'), jsonFormatter);
  assert.equal(builtInFormatters.get('sarif'), sarifFormatter);
  assert.equal(builtInFormatters.get('stylish'), stylishFormatter);
  assert.deepEqual(Array.from(builtInFormatters.keys()), builtInFormatterNames);
  assert.ok(builtInFormatters instanceof Map);
});

void test('builtins namespace re-exports helpers', () => {
  assert.equal(builtins.builtInFormatters, builtInFormatters);
  assert.equal(builtins.builtInFormatterNames, builtInFormatterNames);
  assert.equal(builtins.isBuiltInFormatterName, isBuiltInFormatterName);
});

void test('isBuiltInFormatterName detects built-ins', () => {
  for (const name of builtInFormatterNames) {
    assert.equal(isBuiltInFormatterName(name), true);
  }
  assert.equal(isBuiltInFormatterName('nope'), false);
});
