import test from 'node:test';
import assert from 'node:assert/strict';

import { getFlattenedTokens } from '../../src/utils/tokens/index.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('getFlattenedTokens flattens tokens for specified theme and preserves metadata', async () => {
  const tokens = {
    light: {
      $version: '1.0.0',
      palette: {
        base: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
          $deprecated: { $replacement: '#/palette/accent' },
        },
        accent: {
          $type: 'color',
          $ref: '#/palette/base',
          $extensions: { 'vendor.example': { note: true } },
        },
      },
    },
    dark: {
      $version: '1.0.0',
      palette: {
        base: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
  } satisfies Record<string, DesignTokens>;

  const flat = await getFlattenedTokens(tokens, 'light');
  const byPath = new Map(flat.map((token) => [token.path, token]));

  const base = byPath.get('palette.base');
  assert.ok(base, 'expected base token');
  assert.equal(base.type, 'color');
  assert.equal(base.metadata.deprecated, '#/palette/accent');
  assert.deepEqual(base.value, { colorSpace: 'srgb', components: [1, 1, 1] });

  const accent = byPath.get('palette.accent');
  assert.ok(accent, 'expected accent token');
  assert.deepEqual(accent.aliases, ['palette.base']);
  assert.deepEqual(accent.metadata.extensions, {
    'vendor.example': { note: true },
  });
});

void test('getFlattenedTokens merges tokens from all themes when none is specified', async () => {
  const tokens = {
    light: {
      $version: '1.0.0',
      palette: {
        base: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        },
      },
    },
    dark: {
      $version: '1.0.0',
      palette: {
        accent: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
  } satisfies Record<string, DesignTokens>;

  const flat = await getFlattenedTokens(tokens);
  const paths = flat.map((token) => token.path).sort();
  assert.deepEqual(paths, ['palette.accent', 'palette.base']);
});

void test('getFlattenedTokens applies name transforms', async () => {
  const tokens = {
    light: {
      Theme: {
        Primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.2, 0.3, 0.4] },
        },
      },
    },
  } satisfies Record<string, DesignTokens>;

  const flat = await getFlattenedTokens(tokens, undefined, {
    nameTransform: 'kebab-case',
  });
  assert.deepEqual(
    flat.map((token) => token.path),
    ['theme.primary'],
  );
});
