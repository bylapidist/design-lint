import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchToken,
  closestToken,
  extractVarName,
} from '../src/utils/token-match.ts';

test('matchToken handles regexp patterns and missing matches', () => {
  assert.equal(matchToken('--brand-primary', [/^--brand-/]), '--brand-primary');
  assert.equal(matchToken('--foo', ['--bar']), null);
});

test('matchToken supports string patterns with wildcards', () => {
  assert.equal(matchToken('--brand-primary', ['--brand-*']), '--brand-primary');
});

test('matchToken is case-insensitive for string patterns', () => {
  assert.equal(matchToken('--BRAND-primary', ['--brand-*']), '--BRAND-primary');
});

test('closestToken skips non-string patterns and handles no suggestion', () => {
  assert.equal(closestToken('--baz', ['--bar', /^--foo-/]), '--bar');
  assert.equal(closestToken('--baz', [/^--foo-/]), null);
});

test('extractVarName parses var() and ignores invalid values', () => {
  assert.equal(extractVarName('var(--x)'), '--x');
  assert.equal(extractVarName('var(--x, 10px)'), '--x');
  assert.equal(extractVarName('var(  --x  )'), '--x');
  assert.equal(extractVarName('--x'), null);
});
