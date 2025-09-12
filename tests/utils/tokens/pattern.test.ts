import test from 'node:test';
import assert from 'node:assert/strict';
import { matchToken, closestToken } from '../../../src/utils/tokens/index.js';

void test('matchToken handles regexp and glob patterns and missing matches', () => {
  assert.equal(matchToken('--brand-primary', [/^--brand-/]), '--brand-primary');
  assert.equal(matchToken('--brand-primary', ['--brand-*']), '--brand-primary');
  assert.equal(matchToken('--foo', ['--bar']), null);
});

void test('matchToken is case-insensitive for string patterns', () => {
  assert.equal(matchToken('--BRAND-primary', ['--brand-*']), '--BRAND-primary');
});

void test('closestToken skips non-string patterns and suggests best match', () => {
  assert.equal(closestToken('--baz', ['--bar', /^--foo-/]), '--bar');
  assert.equal(closestToken('--baz', [/^--foo-/]), null);
});
