import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePath,
  toConstantName,
} from '../../../src/utils/tokens/index.js';

void test('normalizePath canonicalizes JSON Pointer paths', () => {
  assert.equal(normalizePath('foo.bar'), '/foo/bar');
  assert.equal(normalizePath('/foo/bar'), '/foo/bar');
});

void test('normalizePath applies case transforms to pointer segments', () => {
  assert.equal(normalizePath('/Foo/BarBaz', 'kebab-case'), '/foo/bar-baz');
  assert.equal(normalizePath('/foo/bar-baz', 'camelCase'), '/foo/barBaz');
  assert.equal(normalizePath('/foo/bar-baz', 'PascalCase'), '/foo/BarBaz');
});

void test('toConstantName normalizes pointer segments', () => {
  assert.equal(toConstantName('/color/primary'), 'COLOR_PRIMARY');
  assert.equal(toConstantName('/color/primary-dark'), 'COLOR_PRIMARY_DARK');
});
