import test from 'node:test';
import assert from 'node:assert/strict';

import { wrapTokenError } from '../../../src/utils/tokens/wrap-token-error.ts';

void test('wrapTokenError preserves error causes', () => {
  const original = new Error('boom');
  const wrapped = wrapTokenError('dark', original, 'load');
  assert.equal(wrapped.message, 'Failed to load tokens for theme "dark": boom');
  assert.equal((wrapped as { cause?: unknown }).cause, original);
});

void test('wrapTokenError stringifies non-error causes', () => {
  const wrapped = wrapTokenError('light', 42, 'parse');
  assert.equal(wrapped.message, 'Failed to parse tokens for theme "light": 42');
  assert.equal((wrapped as { cause?: unknown }).cause, 42);
});
