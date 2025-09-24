import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBorder } from '../../src/core/token-validators/border.js';

const COLOR = {
  colorSpace: 'srgb',
  components: [0, 0, 0],
  alpha: 1,
  hex: '#000000',
} as const;

const WIDTH = { value: 2, unit: 'px' } as const;

void test('validateBorder accepts complete border values', () => {
  assert.doesNotThrow(() => {
    validateBorder(
      {
        color: { ...COLOR },
        width: { ...WIDTH },
        style: 'solid',
      },
      'border',
    );
  });
});

void test('validateBorder rejects non-record values', () => {
  assert.throws(() => {
    validateBorder(null, 'border');
  }, /invalid border value/);
});

void test('validateBorder rejects extra properties', () => {
  assert.throws(() => {
    validateBorder(
      {
        color: { ...COLOR },
        width: { ...WIDTH },
        style: 'solid',
        mode: 'unexpected',
      },
      'border',
    );
  }, /invalid border value/);
});

void test('validateBorder requires all supported properties', () => {
  assert.throws(() => {
    validateBorder(
      {
        color: { ...COLOR },
        width: { ...WIDTH },
      } as unknown,
      'border',
    );
  }, /invalid border value/);
});
