import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareTokenPath,
  sortTokensByPath,
} from '../../../src/utils/tokens/index.js';
import type { DtifFlattenedToken } from '../../../src/core/types.js';

function dtifToken(
  pointer: string,
  segments: readonly string[],
): DtifFlattenedToken {
  return {
    id: pointer,
    pointer,
    path: segments,
    name: segments[segments.length - 1] ?? '',
    metadata: { extensions: {} },
  };
}

void test('sortTokensByPath orders DTIF tokens by pointer-derived path', () => {
  const tokens = [
    dtifToken('#/b/beta', ['b', 'beta']),
    dtifToken('#/a/alpha', ['a', 'alpha']),
  ];
  const sorted = sortTokensByPath(tokens);
  assert.deepEqual(
    sorted.map((t) => t.pointer),
    ['#/a/alpha', '#/b/beta'],
  );
  assert.equal(tokens[0].pointer, '#/b/beta');
});

void test('compareTokenPath applies name transforms for DTIF tokens', () => {
  const brandColors = dtifToken('#/BrandColors/Primary', [
    'BrandColors',
    'Primary',
  ]);
  const brand = dtifToken('#/brand/Secondary', ['brand', 'Secondary']);
  assert.ok(
    compareTokenPath(brandColors, brand, { nameTransform: 'kebab-case' }) < 0,
  );
  assert.ok(
    compareTokenPath(brand, brandColors, { nameTransform: 'kebab-case' }) > 0,
  );
});
