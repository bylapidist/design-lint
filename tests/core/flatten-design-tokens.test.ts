import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenDesignTokens } from '../../src/core/token-utils.ts';
import type { DesignTokens } from '../../src/core/types.ts';

void test('flattenDesignTokens collects token paths and inherits types', () => {
  const tokens: DesignTokens = {
    colors: {
      $type: 'color',
      red: { $value: '#ff0000' },
      accent: { $value: '#00ff00', $type: 'special' },
      nested: {
        green: { $value: '#00ff00' },
      },
    },
    size: {
      spacing: {
        $type: 'dimension',
        small: { $value: 4 },
      },
    },
  };
  const flat = flattenDesignTokens(tokens);
  assert.deepEqual(flat, [
    { path: 'colors.red', token: { $value: '#ff0000', $type: 'color' } },
    {
      path: 'colors.accent',
      token: { $value: '#00ff00', $type: 'special' },
    },
    {
      path: 'colors.nested.green',
      token: { $value: '#00ff00', $type: 'color' },
    },
    { path: 'size.spacing.small', token: { $value: 4, $type: 'dimension' } },
  ]);
});

void test('flattenDesignTokens preserves $extensions and inherits $deprecated', () => {
  const ext = { 'org.example.tool': { foo: 1 } };
  const tokens: DesignTokens = {
    theme: {
      $type: 'color',
      $deprecated: true,
      base: { $value: '#000', $extensions: ext },
      active: { $value: '#fff', $deprecated: false },
    },
  };
  const flat = flattenDesignTokens(tokens);
  assert.deepEqual(
    flat.find((t) => t.path === 'theme.base')?.token.$extensions,
    ext,
  );
  assert.equal(
    flat.find((t) => t.path === 'theme.base')?.token.$deprecated,
    true,
  );
  assert.equal(
    flat.find((t) => t.path === 'theme.active')?.token.$deprecated,
    false,
  );
});
