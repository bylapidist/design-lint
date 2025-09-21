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
    validateDimension({ value: NaN, unit: 'px' }, 'dim');
  });
  assert.throws(() => {
    validateDimension({ value: Infinity, unit: 'px' }, 'dim');
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
