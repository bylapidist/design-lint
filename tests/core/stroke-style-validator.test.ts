import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStrokeStyle } from '../../src/core/token-validators/strokeStyle.js';

const DASH = { value: 4, unit: 'px' } as const;

void test('validateStrokeStyle accepts keyword styles', () => {
  assert.doesNotThrow(() => {
    validateStrokeStyle('solid', 'stroke');
  });
});

void test('validateStrokeStyle rejects unknown keywords', () => {
  assert.throws(() => {
    validateStrokeStyle('squiggly', 'stroke');
  }, /invalid strokeStyle value/);
});

void test('validateStrokeStyle accepts structured style definitions', () => {
  assert.doesNotThrow(() => {
    validateStrokeStyle(
      {
        dashArray: [{ ...DASH }, { ...DASH, value: 2, unit: 'rem' }],
        lineCap: 'round',
      },
      'stroke',
    );
  });
});

void test('validateStrokeStyle enforces allowed properties', () => {
  assert.throws(() => {
    validateStrokeStyle(
      {
        dashArray: [{ ...DASH }],
        lineCap: 'round',
        mode: 'unexpected',
      },
      'stroke',
    );
  }, /invalid strokeStyle value/);
});

void test('validateStrokeStyle requires dash arrays and known line caps', () => {
  assert.throws(() => {
    validateStrokeStyle(
      {
        dashArray: 'invalid',
        lineCap: 'round',
      },
      'stroke',
    );
  }, /invalid strokeStyle value/);
  assert.throws(() => {
    validateStrokeStyle(
      {
        dashArray: [{ ...DASH }],
        lineCap: 'pointy',
      },
      'stroke',
    );
  }, /invalid strokeStyle value/);
});
