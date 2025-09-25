/**
 * Unit tests for {@link isThemeRecord} domain guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isThemeRecord } from '../../../../src/utils/guards/domain/is-theme-record.js';

void test('isThemeRecord detects multiple themes with shared tokens', () => {
  const themes = {
    light: { color: { $value: '#fff' } },
    dark: { color: { $value: '#000' } },
  };
  assert.equal(isThemeRecord(themes), true);
});

void test('isThemeRecord detects themes without shared tokens when metadata present', () => {
  const themes = {
    light: {
      $version: '1.0.0',
      color: { primary: { $value: '#fff' } },
    },
    dark: {
      $version: '1.0.0',
      typography: { body: { $value: 'Inter' } },
    },
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
  assert.equal(isThemeRecord({ $schema: '1.0' }), false);
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

void test('isThemeRecord rejects non-record themes', () => {
  assert.equal(isThemeRecord({ light: 'foo' }), false);
  const invalid = {
    light: { color: { $value: '#fff' } },
    dark: 'bar',
  };
  assert.equal(isThemeRecord(invalid), false);
});
