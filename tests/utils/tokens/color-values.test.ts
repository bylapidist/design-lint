import test from 'node:test';
import assert from 'node:assert/strict';
import type { FlattenedToken } from '../../../src/core/types.js';
import { collectColorTokenValues } from '../../../src/utils/tokens/color-values.js';

const baseMetadata = { loc: { line: 1, column: 1 } } as const;

void test('collectColorTokenValues normalizes string payloads', () => {
  const token: FlattenedToken = {
    path: '/palette/base',
    type: 'color',
    value: 'rgb(255, 0, 0)',
    metadata: baseMetadata,
  };

  const values = new Set(collectColorTokenValues(token));
  assert(values.has('rgb(255, 0, 0)'));
  assert(values.has('#ff0000'));
});

void test('collectColorTokenValues normalizes DTIF color objects', () => {
  const token: FlattenedToken = {
    path: '/palette/accent',
    type: 'color',
    value: {
      colorSpace: 'display-p3',
      components: [1, 0, 0],
    },
    metadata: baseMetadata,
  };

  const values = new Set(collectColorTokenValues(token));
  assert(values.has('color(display-p3 1 0 0)'));
  assert(values.has('rgb(255, 0, 0)'));
});

void test('collectColorTokenValues includes fallback candidates', () => {
  const token: FlattenedToken = {
    path: '/theme/brand',
    type: 'color',
    value: { colorSpace: 'srgb', components: [1, 0, 0] },
    candidates: [
      {
        ref: '/palette/base',
        value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
      {
        value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
    ],
    metadata: baseMetadata,
  };

  const values = new Set(collectColorTokenValues(token));
  assert(values.has('rgb(255, 0, 0)'));
  assert(values.has('rgb(0, 0, 0)'));
});

void test('collectColorTokenValues ignores non-color tokens', () => {
  const token: FlattenedToken = {
    path: '/spacing/sm',
    type: 'dimension',
    value: { value: 4, unit: 'px' },
    metadata: baseMetadata,
  };

  assert.deepEqual(collectColorTokenValues(token), []);
});
