import test from 'node:test';
import assert from 'node:assert/strict';

import { validateColor } from '../../src/core/token-validators/color.js';

void test('validateColor accepts components, alpha, and hex within range', () => {
  const value = {
    colorSpace: 'srgb',
    components: [0, 0.5, 1],
    alpha: 0.5,
    hex: '#007fff',
  } as const;
  assert.doesNotThrow(() => {
    validateColor(value, 'test');
  });
});

void test('validateColor rejects components outside allowed range', () => {
  const value = {
    colorSpace: 'srgb',
    components: [2, 0, 0],
  } as const;
  assert.throws(() => {
    validateColor(value, 'test');
  });
});

void test('validateColor rejects alpha outside 0-1', () => {
  const value = {
    colorSpace: 'srgb',
    components: [0, 0, 0],
    alpha: -0.1,
  } as const;
  assert.throws(() => {
    validateColor(value, 'test');
  });
});

void test('validateColor rejects non-6-digit hex fallback', () => {
  const value = {
    colorSpace: 'srgb',
    components: [0, 0, 0],
    hex: '#fff',
  } as const;
  assert.throws(() => {
    validateColor(value, 'test');
  });
});

void test('validateColor accepts hex string values', () => {
  assert.doesNotThrow(() => {
    validateColor('#000', 'test');
  });
});

void test('validateColor rejects invalid color strings', () => {
  assert.throws(() => {
    validateColor('not-a-color', 'test');
  });
});
