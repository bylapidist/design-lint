import test from 'node:test';
import assert from 'node:assert/strict';
import { getFlattenedTokens } from '../../src/utils/tokens/index.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('getFlattenedTokens flattens tokens for specified theme and preserves metadata', () => {
  const tokens: Record<string, DesignTokens> = {
    light: {
      palette: {
        $type: 'color',
        $deprecated: true,
        primary: { $value: { colorSpace: 'srgb', components: [1, 1, 1] } },
        secondary: {
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
          $extensions: { 'vendor.example': { note: true } },
        },
      },
    },
    dark: {
      palette: {
        $type: 'color',
        primary: {
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
        $type: 'color',
        primary: { $value: { colorSpace: 'srgb', components: [1, 1, 1] } },
      },
    },
    dark: {
      palette: {
        $type: 'color',
        secondary: { $value: { colorSpace: 'srgb', components: [0, 0, 0] } },
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
        $type: 'color',
        base: { $value: { colorSpace: 'srgb', components: [1, 0, 0] } },
        primary: { $ref: '/palette/base' },
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
        $type: 'color',
        primaryColor: { $value: { colorSpace: 'srgb', components: [1, 1, 1] } },
      },
    },
    dark: {
      ColorGroup: {
        $type: 'color',
        primaryColor: { $value: { colorSpace: 'srgb', components: [0, 0, 0] } },
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
  const result = getFlattenedTokens(tokens, 'default');
  assert.deepEqual(result, []);
});
