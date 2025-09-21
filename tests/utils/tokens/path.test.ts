import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePath,
  toConstantName,
} from '../../../src/utils/tokens/index.js';

void test('normalizePath rejects slash separators', () => {
  assert.throws(() => normalizePath('foo/bar-baz'));
});

void test('normalizePath converts JSON Pointer fragments to dot notation', () => {
  assert.equal(normalizePath('#/color/base'), 'color.base');
  assert.equal(
    normalizePath('theme.tokens.json#/color/primary', 'camelCase'),
    'color.primary',
  );
});

void test('normalizePath applies case transforms', () => {
  assert.equal(normalizePath('foo.barBaz', 'kebab-case'), 'foo.bar-baz');
  assert.equal(normalizePath('foo.bar-baz', 'camelCase'), 'foo.barBaz');
  assert.equal(normalizePath('foo.bar-baz', 'PascalCase'), 'foo.BarBaz');
});

void test('normalizePath rejects invalid pointer fragments', () => {
  assert.throws(() => normalizePath('#invalid-pointer'));
});

void test('toConstantName transforms paths to upper snake case', () => {
  assert.equal(toConstantName('color.primary'), 'COLOR_PRIMARY');
  assert.equal(toConstantName('color.primary-dark'), 'COLOR_PRIMARY_DARK');
});
