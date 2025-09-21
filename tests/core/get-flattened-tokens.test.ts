import test from 'node:test';
import assert from 'node:assert/strict';
import { getFlattenedTokens } from '../../src/utils/tokens/index.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('getFlattenedTokens flattens tokens for specified theme and preserves metadata', () => {
  const tokens: Record<string, DesignTokens> = {
    light: {
      palette: {
        $deprecated: true,
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        },
        secondary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
          $extensions: { 'vendor.example': { note: true } },
        },
      },
    },
    dark: {
      palette: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.066, 0.066, 0.066] },
        },
      },
    },
  };

  const flat = getFlattenedTokens(tokens, 'light');
  assert.deepEqual(flat, [
    {
      path: '/palette/primary',
      value: { colorSpace: 'srgb', components: [1, 1, 1] },
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: true,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: '/palette/secondary',
      value: { colorSpace: 'srgb', components: [0, 0, 0] },
      type: 'color',
      metadata: {
        description: undefined,
        extensions: { 'vendor.example': { note: true } },
        deprecated: true,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});

void test('getFlattenedTokens merges tokens from all themes when none is specified', () => {
  const tokens: Record<string, DesignTokens> = {
    light: {
      palette: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        },
      },
    },
    dark: {
      palette: {
        secondary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
  };
  const flat = getFlattenedTokens(tokens);
  assert.deepEqual(flat, [
    {
      path: '/palette/primary',
      value: { colorSpace: 'srgb', components: [1, 1, 1] },
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: '/palette/secondary',
      value: { colorSpace: 'srgb', components: [0, 0, 0] },
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});

void test('getFlattenedTokens resolves aliases', () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      palette: {
        base: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
        primary: { $type: 'color', $ref: '#/palette/base' },
      },
    },
  };
  const flat = getFlattenedTokens(tokens, 'default');
  assert.deepEqual(flat, [
    {
      path: '/palette/base',
      value: { colorSpace: 'srgb', components: [1, 0, 0] },
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: '/palette/primary',
      value: { colorSpace: 'srgb', components: [1, 0, 0] },
      type: 'color',
      ref: '/palette/base',
      aliases: ['/palette/base'],
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});

void test('getFlattenedTokens applies name transforms', () => {
  const tokens: Record<string, DesignTokens> = {
    light: {
      ColorGroup: {
        primaryColor: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        },
      },
    },
    dark: {
      ColorGroup: {
        primaryColor: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
  };
  const flat = getFlattenedTokens(tokens, undefined, {
    nameTransform: 'camelCase',
  });
  assert.deepEqual(flat, [
    {
      path: '/colorGroup/primaryColor',
      value: { colorSpace: 'srgb', components: [1, 1, 1] },
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});

void test('getFlattenedTokens returns empty array for primitive token values', () => {
  const tokens = {
    default: {
      colors: { primary: '#fff' },
      deprecations: { old: { replacement: 'new' } },
    },
  } as unknown as Record<string, DesignTokens>;
  assert.throws(
    () => getFlattenedTokens(tokens, 'default'),
    /DTIF validation failed/i,
  );
});
