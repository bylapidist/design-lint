/**
 * Unit tests for the SARIF formatter index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as sarif from '../../../src/formatters/sarif/index.js';

void test('sarif formatter index exports sarifFormatter', () => {
  assert.equal(typeof sarif.sarifFormatter, 'function');
});
