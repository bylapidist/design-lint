import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPathSegments,
  normalizePath,
  toConstantName,
} from '../../../src/utils/tokens/index.js';

void test('normalizePath canonicalizes JSON Pointer paths', () => {
  assert.equal(normalizePath('foo.bar'), '/foo/bar');
  assert.equal(normalizePath('/foo/bar'), '/foo/bar');
  assert.equal(normalizePath('#/foo/bar'), '/foo/bar');
  assert.equal(
    normalizePath('../tokens/base.dtif.json#palette.primary'),
    '../tokens/base.dtif.json#/palette.primary',
  );
});

void test('normalizePath applies case transforms to pointer segments', () => {
  assert.equal(normalizePath('/Foo/BarBaz', 'kebab-case'), '/foo/bar-baz');
  assert.equal(normalizePath('/foo/bar-baz', 'camelCase'), '/foo/barBaz');
  assert.equal(normalizePath('/foo/bar-baz', 'PascalCase'), '/foo/BarBaz');
  assert.equal(
    normalizePath('../tokens/base.dtif.json#/Foo/Baz', 'kebab-case'),
    '../tokens/base.dtif.json#/foo/baz',
  );
});

void test('getPathSegments decodes pointer fragments and ignores document URIs', () => {
  assert.deepEqual(getPathSegments('#/foo~0bar/baz~1qux'), [
    'foo~bar',
    'baz/qux',
  ]);
  assert.deepEqual(
    getPathSegments('../tokens/base.dtif.json#/palette/primary'),
    ['palette', 'primary'],
  );
});

void test('toConstantName normalizes pointer segments', () => {
  assert.equal(toConstantName('/color/primary'), 'COLOR_PRIMARY');
  assert.equal(toConstantName('/color/primary-dark'), 'COLOR_PRIMARY_DARK');
  assert.equal(
    toConstantName('../tokens/base.dtif.json#/color/brand'),
    'COLOR_BRAND',
  );
});
