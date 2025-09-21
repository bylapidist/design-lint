import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens } from '../../src/core/types.js';
import { TokenRegistry } from '../../src/core/token-registry.js';

const tokens: Record<string, DesignTokens> = {
  default: {
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 1, 1] },
      },
      secondary: { $type: 'color', $ref: '#/color/primary' },
    },
  },
  dark: {
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
    },
  },
};

void test('getToken retrieves tokens by theme and resolves aliases', () => {
  const registry = new TokenRegistry(tokens);
  assert.deepEqual(registry.getToken('/color/primary')?.value, {
    colorSpace: 'srgb',
    components: [1, 1, 1],
  });
  assert.deepEqual(registry.getToken('/color/secondary')?.value, {
    colorSpace: 'srgb',
    components: [1, 1, 1],
  });
  assert.deepEqual(registry.getToken('/color/primary', 'dark')?.value, {
    colorSpace: 'srgb',
    components: [0, 0, 0],
  });
});

void test('getToken normalizes paths and applies name transforms', () => {
  const registry = new TokenRegistry(
    {
      default: {
        ColorGroup: {
          primaryColor: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [0.066, 0.066, 0.066] },
          },
          secondaryColor: {
            $type: 'color',
            $ref: '#/ColorGroup/primaryColor',
          },
        },
      },
    },
    { nameTransform: 'kebab-case' },
  );
  assert.deepEqual(registry.getToken('/ColorGroup/primaryColor')?.value, {
    colorSpace: 'srgb',
    components: [0.066, 0.066, 0.066],
  });
  assert.deepEqual(registry.getToken('/color-group/primary-color')?.value, {
    colorSpace: 'srgb',
    components: [0.066, 0.066, 0.066],
  });
});

void test('getTokens returns flattened tokens and dedupes across themes', () => {
  const registry = new TokenRegistry(tokens);
  const all = registry.getTokens();
  assert.equal(all.length, 2);
  const dark = registry.getTokens('dark');
  assert.equal(dark.length, 1);
  assert.equal(dark[0].path, '/color/primary');
});
