import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens } from '../../src/core/types.js';
import { TokenRegistry } from '../../src/core/token-registry.js';

const tokens: Record<string, DesignTokens> = {
  default: {
    color: {
      $type: 'color',
      primary: { $value: '#fff' },
      secondary: { $value: '{color.primary}' },
    },
  },
  dark: {
    color: {
      $type: 'color',
      primary: { $value: '#000' },
    },
  },
};

void test('getToken retrieves tokens by theme and resolves aliases', () => {
  const registry = new TokenRegistry(tokens);
  assert.equal(registry.getToken('color.primary')?.value, '#fff');
  assert.equal(registry.getToken('color.secondary')?.value, '#fff');
  assert.equal(registry.getToken('color.primary', 'dark')?.value, '#000');
});

void test('getToken normalizes paths and applies name transforms', () => {
  const registry = new TokenRegistry(
    {
      default: {
        ColorGroup: {
          $type: 'color',
          primaryColor: { $value: '#111' },
        },
      },
    },
    { nameTransform: 'kebab-case' },
  );
  assert.equal(registry.getToken('ColorGroup.primaryColor')?.value, '#111');
  assert.equal(registry.getToken('color-group.primary-color')?.value, '#111');
});

void test('getTokens returns flattened tokens and dedupes across themes', () => {
  const registry = new TokenRegistry(tokens);
  const all = registry.getTokens();
  assert.equal(all.length, 2);
  const dark = registry.getTokens('dark');
  assert.equal(dark.length, 1);
  assert.equal(dark[0].path, 'color.primary');
});
