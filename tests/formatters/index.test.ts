/**
 * Unit tests for the formatters entry point.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as formatters from '../../src/formatters/index.js';

void test('formatters expose built-in formatters and helper namespace', () => {
  assert.equal(typeof formatters.getFormatter, 'function');
  assert.equal(typeof formatters.resolveFormatter, 'function');
  assert.equal(typeof formatters.isFormatter, 'function');
  assert.equal(typeof formatters.isBuiltInFormatterName, 'function');
  assert.equal(typeof formatters.jsonFormatter, 'function');
  assert.equal(typeof formatters.sarifFormatter, 'function');
  assert.equal(typeof formatters.stylishFormatter, 'function');
  assert.equal(typeof formatters.helpers.getFormatter, 'function');
  assert.equal(typeof formatters.helpers.resolveFormatter, 'function');
  assert.equal(typeof formatters.helpers.isFormatter, 'function');
  assert.equal(typeof formatters.helpers.isBuiltInFormatterName, 'function');
  assert.equal(
    formatters.helpers.builtInFormatters.get('json'),
    formatters.jsonFormatter,
  );
  assert.equal(
    typeof formatters.helpers.builtins.isBuiltInFormatterName,
    'function',
  );
  assert.equal(typeof formatters.json.jsonFormatter, 'function');
  assert.equal(typeof formatters.sarif.sarifFormatter, 'function');
  assert.equal(typeof formatters.stylish.stylishFormatter, 'function');
});

void test('formatters expose expected keys', () => {
  assert.deepEqual(Object.keys(formatters).sort(), [
    'builtInFormatters',
    'getFormatter',
    'helpers',
    'isBuiltInFormatterName',
    'isFormatter',
    'json',
    'jsonFormatter',
    'resolveFormatter',
    'sarif',
    'sarifFormatter',
    'stylish',
    'stylishFormatter',
  ]);
});
