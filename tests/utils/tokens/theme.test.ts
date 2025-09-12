import test from 'node:test';
import assert from 'node:assert/strict';
import { toThemeRecord } from '../../../src/utils/tokens/index.js';

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
