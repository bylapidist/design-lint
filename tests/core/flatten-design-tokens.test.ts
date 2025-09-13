import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenDesignTokens } from '../../src/utils/tokens/index.js';
import type { DesignTokens } from '../../src/core/types.js';
import { registerTokenValidator } from '../../src/core/token-validators/index.js';

void test('flattenDesignTokens collects token paths and inherits types', () => {
  registerTokenValidator('special', () => undefined);
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
        small: { $value: { value: 4, unit: 'px' } },
      },
    },
  };
  const flat = flattenDesignTokens(tokens);
  assert.deepEqual(flat, [
    {
      path: 'colors.red',
      value: '#ff0000',
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: 'colors.accent',
      value: '#00ff00',
      type: 'special',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: 'colors.nested.green',
      value: '#00ff00',
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: 'size.spacing.small',
      value: { value: 4, unit: 'px' },
      type: 'dimension',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
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
    flat.find((t) => t.path === 'theme.base')?.metadata.extensions,
    ext,
  );
  assert.equal(
    flat.find((t) => t.path === 'theme.base')?.metadata.deprecated,
    true,
  );
  assert.equal(
    flat.find((t) => t.path === 'theme.active')?.metadata.deprecated,
    false,
  );
});

void test('flattenDesignTokens resolves alias references', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#fff' },
      primary: { $value: '{color.base}' },
    },
  };
  const flat = flattenDesignTokens(tokens);
  assert.deepEqual(flat, [
    {
      path: 'color.base',
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
      path: 'color.primary',
      value: '#fff',
      type: 'color',
      aliases: ['color.base'],
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});

void test('flattenDesignTokens rejects circular aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $value: '{color.b}' },
      b: { $value: '{color.a}' },
    },
  };
  assert.throws(() => flattenDesignTokens(tokens), /circular alias reference/i);
});

void test('flattenDesignTokens rejects unknown aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $value: '{color.missing}' },
    },
  };
  assert.throws(() => flattenDesignTokens(tokens), /references unknown token/i);
});

void test('flattenDesignTokens rejects slash-separated aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#fff' },
      primary: { $value: '{color/base}' },
    },
  };
  assert.throws(() => flattenDesignTokens(tokens));
});

void test('flattenDesignTokens applies name transforms', () => {
  const tokens: DesignTokens = {
    ColorGroup: {
      $type: 'color',
      primaryColor: { $value: '#000' },
      secondaryColor: { $value: '{ColorGroup.primaryColor}' },
    },
  };
  const flat = flattenDesignTokens(tokens, { nameTransform: 'kebab-case' });
  assert.deepEqual(flat, [
    {
      path: 'color-group.primary-color',
      value: '#000',
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: 'color-group.secondary-color',
      value: '#000',
      type: 'color',
      aliases: ['color-group.primary-color'],
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});
