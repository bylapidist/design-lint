import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNumber } from '../../src/core/token-validators/number.js';
import { validateDimension } from '../../src/core/token-validators/dimension.js';
import { validateDuration } from '../../src/core/token-validators/duration.js';

void test('validateNumber rejects non-finite numbers', () => {
  assert.throws(() => {
    validateNumber(NaN, 'num');
  }, /invalid number/);
  assert.throws(() => {
    validateNumber(Infinity, 'num');
  }, /invalid number/);
});

void test('validateDimension rejects non-finite numbers', () => {
  assert.throws(() => {
    validateDimension(
      { dimensionType: 'length', value: Number.NaN, unit: 'px' },
      'dim',
    );
  }, /invalid dimension value/);
  assert.throws(() => {
    validateDimension(
      { dimensionType: 'length', value: Number.POSITIVE_INFINITY, unit: 'px' },
      'dim',
    );
  }, /invalid dimension value/);
});

void test('validateDimension accepts references and fallbacks', () => {
  assert.doesNotThrow(() => {
    validateDimension({ dimensionType: 'length', value: 4, unit: 'px' }, 'dim');
  });
  assert.doesNotThrow(() => {
    validateDimension({ $ref: '/spacing/sm' }, 'dim');
  });
  assert.doesNotThrow(() => {
    validateDimension(
      [
        { $ref: '/spacing/base' },
        { fn: 'calc', parameters: [2, { $ref: '/spacing/base' }] },
      ],
      'dim',
    );
  });
});

void test('validateDuration rejects non-finite numbers', () => {
  assert.throws(() => {
    validateDuration(
      {
        durationType: 'css.transition-duration',
        value: Number.NaN,
        unit: 'ms',
      },
      'dur',
    );
  }, /invalid duration value/);
  assert.throws(() => {
    validateDuration(
      {
        durationType: 'css.transition-duration',
        value: Number.POSITIVE_INFINITY,
        unit: 'ms',
      },
      'dur',
    );
  }, /invalid duration value/);
});

void test('validateDuration accepts references and fallbacks', () => {
  assert.doesNotThrow(() => {
    validateDuration(
      {
        durationType: 'css.animation-duration',
        value: 150,
        unit: 'ms',
      },
      'dur',
    );
  });
  assert.doesNotThrow(() => {
    validateDuration({ $ref: '/duration/short' }, 'dur');
  });
  assert.doesNotThrow(() => {
    validateDuration(
      [
        { durationType: 'css.timeline.progress', value: 50, unit: '%' },
        { $ref: '/duration/short' },
      ],
      'dur',
    );
  });
});
