import test from 'node:test';
import assert from 'node:assert/strict';
import { toThemeRecord } from '../../../src/utils/tokens/index.js';
import { attachDtifFlattenedTokens } from '../../../src/utils/tokens/dtif-cache.js';
import type { DtifFlattenedToken } from '../../../src/core/types.js';

void test('wrap single token object into default theme', () => {
  const tokens: Record<string, { $type: string; $value: string }> = {
    color: { $type: 'color', $value: '#fff' },
  };
  const record = toThemeRecord(tokens);
  assert.deepEqual(Object.keys(record), ['default']);
  assert.equal(record.default.color.$value, '#fff');
});

void test('preserve existing theme record', () => {
  const tokens: Record<
    string,
    Record<string, { $type: string; $value: string }>
  > = {
    light: { color: { $type: 'color', $value: '#fff' } },
    dark: { color: { $type: 'color', $value: '#000' } },
  };
  const record = toThemeRecord(tokens);
  assert.equal(record.dark.color.$value, '#000');
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
