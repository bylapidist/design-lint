/**
 * Unit tests for the get-formatter module index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as getFormatterMod from '../../../src/formatters/get-formatter/index.js';

void test('get-formatter module exposes helpers', () => {
  assert.equal(typeof getFormatterMod.getFormatter, 'function');
  assert.equal(typeof getFormatterMod.resolveFormatter, 'function');
  assert.equal(typeof getFormatterMod.isFormatter, 'function');
  assert.equal(typeof getFormatterMod.isBuiltInFormatterName, 'function');
});
