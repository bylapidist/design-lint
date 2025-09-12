import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchToken,
  closestToken,
  extractVarName,
  flattenDesignTokens,
  normalizePath,
} from '../src/utils/tokens/index.js';

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

void test('extractVarName parses var() and ignores invalid values', () => {
  assert.equal(extractVarName('var(--x)'), '--x');
  assert.equal(extractVarName('var(--x, 10px)'), '--x');
  assert.equal(extractVarName('var(  --x  )'), '--x');
  assert.equal(extractVarName('--x'), null);
  assert.equal(extractVarName('var(--foo.bar)'), null);
});

void test('flattenDesignTokens provides location information', () => {
  const tokens = {
    color: { $type: 'color', blue: { $value: '#00f' } },
  };
  const result = flattenDesignTokens(tokens);
  assert.deepEqual(result[0].metadata.loc, { line: 1, column: 1 });
});

void test('normalizePath converts separators and applies case transforms', () => {
  assert.equal(normalizePath('foo/bar-baz'), 'foo.bar-baz');
  assert.equal(normalizePath('foo/barBaz', 'kebab-case'), 'foo.bar-baz');
  assert.equal(normalizePath('foo/bar-baz', 'camelCase'), 'foo.barBaz');
  assert.equal(normalizePath('foo/bar-baz', 'PascalCase'), 'foo.BarBaz');
});
