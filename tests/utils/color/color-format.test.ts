/**
 * Unit tests for color utilities {@link detectColorFormat} and {@link namedColors}.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { color } from '../../../src/utils/index.js';

const { detectColorFormat, namedColors } = color;

void test('detectColorFormat identifies formats', () => {
  assert.equal(detectColorFormat('#fff'), 'hex');
  assert.equal(detectColorFormat('rgba(0,0,0,1)'), 'rgba');
  assert.equal(detectColorFormat('rgb(0,0,0)'), 'rgb');
  assert.equal(detectColorFormat('hsla(0 0% 0% / 1)'), 'hsla');
  assert.equal(detectColorFormat('hsl(0 0% 0%)'), 'hsl');
  assert.equal(detectColorFormat('hwb(0 0% 0%)'), 'hwb');
  assert.equal(detectColorFormat('lab(0% 0 0)'), 'lab');
  assert.equal(detectColorFormat('lch(0% 0 0)'), 'lch');
  assert.equal(detectColorFormat('color(display-p3 0 0 0)'), 'color');
});

void test('detectColorFormat falls back to named colors', () => {
  assert.equal(detectColorFormat('red'), 'named');
  assert.equal(namedColors.has('red'), true);
});

void test('detectColorFormat returns null for unknown formats', () => {
  assert.equal(detectColorFormat('invalid'), null);
});
