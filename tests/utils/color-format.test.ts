import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectColorFormat,
  namedColors,
} from '../../src/utils/color-format.js';

void test('detectColorFormat identifies formats', () => {
  assert.equal(detectColorFormat('#fff'), 'hex');
  assert.equal(detectColorFormat('rgb(0,0,0)'), 'rgb');
  assert.equal(detectColorFormat('hsl(0 0% 0%)'), 'hsl');
});

void test('detectColorFormat falls back to named colors', () => {
  assert.equal(detectColorFormat('red'), 'named');
  assert.equal(namedColors.has('red'), true);
});

void test('detectColorFormat returns null for unknown formats', () => {
  assert.equal(detectColorFormat('invalid'), null);
});
