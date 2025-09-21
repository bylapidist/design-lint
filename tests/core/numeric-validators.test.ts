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
      { dimensionType: 'length', value: NaN, unit: 'px' },
      'dim',
    );
  });
  assert.throws(() => {
    validateDimension(
      { dimensionType: 'length', value: Infinity, unit: 'px' },
      'dim',
    );
  });
});

void test('validateDimension accepts DTIF dimension units', () => {
  assert.doesNotThrow(() => {
    validateDimension({ dimensionType: 'length', value: 1, unit: 'em' }, 'dim');
  });
  assert.doesNotThrow(() => {
    validateDimension({ dimensionType: 'length', value: 1, unit: '%' }, 'dim');
  });
  assert.doesNotThrow(() => {
    validateDimension(
      { dimensionType: 'angle', value: 45, unit: 'deg' },
      'dim',
    );
  });
  assert.doesNotThrow(() => {
    validateDimension(
      { dimensionType: 'resolution', value: 2, unit: 'dppx' },
      'dim',
    );
  });
  assert.doesNotThrow(() => {
    validateDimension(
      { dimensionType: 'custom', value: 1, unit: 'acme.spacing.sm' },
      'dim',
    );
  });
});

void test('validateDimension enforces fontScale constraints', () => {
  assert.throws(() => {
    validateDimension(
      { dimensionType: 'angle', value: 1, unit: 'deg', fontScale: true },
      'dim',
    );
  });
  assert.throws(() => {
    validateDimension(
      { dimensionType: 'length', value: 1, unit: 'px', fontScale: 1 as never },
      'dim',
    );
  });
});

void test('validateDuration rejects non-finite numbers', () => {
  assert.throws(() => {
    validateDuration(
      { durationType: 'css.transition-duration', value: NaN, unit: 's' },
      'dur',
    );
  });
  assert.throws(() => {
    validateDuration(
      { durationType: 'css.transition-duration', value: Infinity, unit: 's' },
      'dur',
    );
  });
});
