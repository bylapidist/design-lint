import test from 'node:test';
import assert from 'node:assert/strict';
import { toThemeRecord } from '../../../src/utils/tokens/index.js';
import { attachDtifFlattenedTokens } from '../../../src/utils/tokens/dtif-cache.js';
import type { DtifFlattenedToken } from '../../../src/core/types.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('wrap single token object into default theme', () => {
  const tokens = {
    color: { $type: 'color', $value: srgb([1, 1, 1]) },
  };
  const record = toThemeRecord(tokens);
  assert.deepEqual(Object.keys(record), ['default']);
  assert.deepEqual(record.default.color.$value, srgb([1, 1, 1]));
});

void test('preserve existing theme record', () => {
  const tokens = {
    light: { color: { $type: 'color', $value: srgb([1, 1, 1]) } },
    dark: { color: { $type: 'color', $value: srgb([0, 0, 0]) } },
  };
  const record = toThemeRecord(tokens);
  assert.deepEqual(record.dark.color.$value, srgb([0, 0, 0]));
});

void test('return empty record for invalid input', () => {
  const record = toThemeRecord(undefined);
  assert.deepEqual(record, {});
});

void test('treat DTIF documents with cached flattening as single theme', () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      red: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
  } satisfies Record<string, unknown>;
  const flattened: DtifFlattenedToken[] = [
    {
      pointer: '#/color/red',
      segments: ['color', 'red'],
      name: 'red',
      type: 'color',
      value: { colorSpace: 'srgb', components: [1, 0, 0] },
      metadata: {},
    },
  ];
  attachDtifFlattenedTokens(tokens, flattened);
  const record = toThemeRecord(tokens);
  assert.deepEqual(Object.keys(record), ['default']);
  const red = record.default.color as {
    red: { $value: { components: number[] } };
  };
  assert.deepEqual(red.red.$value.components, [1, 0, 0]);
});
