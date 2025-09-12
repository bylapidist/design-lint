import test from 'node:test';
import assert from 'node:assert/strict';
import { getFlattenedTokens } from '../../src/utils/tokens/index.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('getFlattenedTokens flattens tokens for specified theme and preserves metadata', () => {
  const tokens: Record<string, DesignTokens> = {
    light: {
      palette: {
        $type: 'color',
        $deprecated: 'use new palette',
        primary: { $value: '#fff' },
        secondary: {
          $value: '#000',
          $extensions: { 'vendor.example': { note: true } },
        },
      },
    },
    dark: {
      palette: {
        $type: 'color',
        primary: { $value: '#111' },
      },
    },
  };

  const flat = getFlattenedTokens(tokens, 'light');
  assert.deepEqual(flat, [
    {
      path: 'palette.primary',
      value: '#fff',
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: 'use new palette',
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: 'palette.secondary',
      value: '#000',
      type: 'color',
      metadata: {
        description: undefined,
        extensions: { 'vendor.example': { note: true } },
        deprecated: 'use new palette',
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});

void test('getFlattenedTokens merges tokens from all themes when none is specified', () => {
  const tokens: Record<string, DesignTokens> = {
    light: { palette: { $type: 'color', primary: { $value: '#fff' } } },
    dark: { palette: { $type: 'color', secondary: { $value: '#000' } } },
  };
  const flat = getFlattenedTokens(tokens);
  assert.deepEqual(flat, [
    {
      path: 'palette.primary',
      value: '#fff',
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: 'palette.secondary',
      value: '#000',
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
        base: { $value: '#f00' },
        primary: { $value: '{palette.base}' },
      },
    },
  };
  const flat = getFlattenedTokens(tokens, 'default');
  assert.deepEqual(flat, [
    {
      path: 'palette.base',
      value: '#f00',
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: 'palette.primary',
      value: '#f00',
      type: 'color',
      aliases: ['palette.base'],
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
      ColorGroup: { $type: 'color', primaryColor: { $value: '#fff' } },
    },
    dark: {
      ColorGroup: { $type: 'color', primaryColor: { $value: '#000' } },
    },
  };
  const flat = getFlattenedTokens(tokens, undefined, {
    nameTransform: 'camelCase',
  });
  assert.deepEqual(flat, [
    {
      path: 'colorGroup.primaryColor',
      value: '#fff',
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

void test('getFlattenedTokens rejects primitive token values', () => {
  const tokens = {
    default: {
      colors: { primary: '#fff' },
      deprecations: { old: { replacement: 'new' } },
    },
  } as unknown as Record<string, DesignTokens>;
  assert.throws(
    () => getFlattenedTokens(tokens, 'default'),
    /must be an object with \$value/i,
  );
});
