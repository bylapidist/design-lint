import test from 'node:test';
import assert from 'node:assert/strict';
import { guards } from '../../src/utils/index.js';

const { isThemeRecord } = guards.domain;

void test('isThemeRecord detects multiple themes with shared tokens', () => {
  const themes = {
    light: { color: { $value: '#fff' } },
    dark: { color: { $value: '#000' } },
  };
  assert.equal(isThemeRecord(themes), true);
});

void test('isThemeRecord detects single theme with nested group', () => {
  const themes = {
    light: {
      color: { $value: '#fff' },
      nested: { color: { $value: '#000' } },
    },
  };
  assert.equal(isThemeRecord(themes), true);
});

void test('isThemeRecord rejects invalid structures', () => {
  assert.equal(isThemeRecord(null), false);
  const single = {
    light: {
      color: { $value: '#fff' },
      size: { $value: '1rem' },
    },
  };
  assert.equal(isThemeRecord(single), false);
  const noShared = {
    light: { color: { $value: '#fff' } },
    dark: { size: { $value: '1rem' } },
  };
  assert.equal(isThemeRecord(noShared), false);
});
