/**
 * Unit tests for the color utility index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as color from '../../../src/utils/color/index.js';

void test('color exports format helpers', () => {
  assert.equal(typeof color.detectColorFormat, 'function');
  assert.equal(color.namedColors instanceof Set, true);
});
