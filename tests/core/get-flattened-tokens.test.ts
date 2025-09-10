import test from 'node:test';
import assert from 'node:assert/strict';
import { getFlattenedTokens } from '../../src/core/token-utils.ts';
import type { DesignTokens } from '../../src/core/types.ts';

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
      token: { $value: '#fff', $type: 'color', $deprecated: 'use new palette' },
    },
    {
      path: 'palette.secondary',
      token: {
        $value: '#000',
        $type: 'color',
        $deprecated: 'use new palette',
        $extensions: { 'vendor.example': { note: true } },
      },
    },
  ]);
});

void test('getFlattenedTokens defaults to the "default" theme', () => {
  const tokens: DesignTokens = {
    palette: { $type: 'color', primary: { $value: '#fff' } },
  };
  const flat = getFlattenedTokens({ default: tokens });
  assert.deepEqual(flat, [
    {
      path: 'palette.primary',
      token: { $value: '#fff', $type: 'color' },
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
    { path: 'palette.base', token: { $value: '#f00', $type: 'color' } },
    { path: 'palette.primary', token: { $value: '#f00', $type: 'color' } },
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
