import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens } from '../../src/core/types.js';
import { TokenRegistry } from '../../src/core/token-registry.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

const tokens: Record<string, DesignTokens> = {
  default: {
    $version: '1.0.0',
    color: {
      primary: { $type: 'color', $value: srgb([1, 1, 1]) },
      secondary: { $type: 'color', $ref: '#/color/primary' },
    },
  } as unknown as DesignTokens,
  dark: {
    $version: '1.0.0',
    color: {
      primary: { $type: 'color', $value: srgb([0, 0, 0]) },
    },
  } as unknown as DesignTokens,
};

void test('getToken retrieves tokens by theme and resolves aliases', async () => {
  const registry = await TokenRegistry.create(tokens);
  assert.deepEqual(registry.getToken('color.primary')?.value, srgb([1, 1, 1]));
  assert.deepEqual(
    registry.getToken('color.secondary')?.value,
    srgb([1, 1, 1]),
  );
  assert.deepEqual(
    registry.getToken('color.primary', 'dark')?.value,
    srgb([0, 0, 0]),
  );
});

void test('getToken normalizes paths and applies name transforms', async () => {
  const registry = await TokenRegistry.create(
    {
      default: {
        $version: '1.0.0',
        ColorGroup: {
          primaryColor: {
            $type: 'color',
            $value: srgb([0.0666666667, 0.0666666667, 0.0666666667]),
          },
        },
      } as unknown as DesignTokens,
    },
    { nameTransform: 'kebab-case' },
  );
  const expected = srgb([0.0666666667, 0.0666666667, 0.0666666667]);
  assert.deepEqual(
    registry.getToken('ColorGroup.primaryColor')?.value,
    expected,
  );
  assert.deepEqual(
    registry.getToken('color-group.primary-color')?.value,
    expected,
  );
});

void test('getTokens returns flattened tokens and dedupes across themes', async () => {
  const registry = await TokenRegistry.create(tokens);
  const all = registry.getTokens();
  assert.equal(all.length, 2);
  const dark = registry.getTokens('dark');
  assert.equal(dark.length, 1);
  assert.equal(dark[0].path, 'color.primary');
});

void test('TokenRegistry.create flattens DTIF documents', async () => {
  const dtifTokens = {
    default: {
      $version: '1.0.0',
      color: {
        base: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.1, 0.2, 0.3],
          },
        },
        alias: {
          $type: 'color',
          $ref: '#/color/base',
        },
      },
    },
  } satisfies Record<string, Record<string, unknown>>;

  const registry = await TokenRegistry.create(dtifTokens);
  const base = registry.getToken('color.base');
  assert.ok(base, 'expected base token');
  assert.equal(base.type, 'color');
  assert.deepEqual(base.value, {
    colorSpace: 'srgb',
    components: [0.1, 0.2, 0.3],
  });

  const alias = registry.getToken('color.alias');
  assert.ok(alias, 'expected alias token');
  assert.equal(alias.aliases?.[0], 'color.base');
  assert.deepEqual(alias.value, {
    colorSpace: 'srgb',
    components: [0.1, 0.2, 0.3],
  });
});
