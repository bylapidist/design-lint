/**
 * Unit tests for wrapTokenError.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapTokenError } from '../../../src/utils/tokens/wrap-token-error.js';

void test('formats message and preserves cause', () => {
  const cause = new Error('boom');
  const err = wrapTokenError('light', cause, 'parse');
  assert.equal(err.message, 'Failed to parse tokens for theme "light": boom');
  assert.equal(err.cause, cause);
});

void test('handles non-error causes', () => {
  const err = wrapTokenError('dark', 'oops', 'read');
  assert.equal(err.message, 'Failed to read tokens for theme "dark": oops');
});
