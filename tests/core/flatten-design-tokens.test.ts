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
        small: { $value: { dimensionType: 'length', value: 4, unit: 'px' } },
      },
    },
  };
  const flat = flattenDesignTokens(tokens);
  assert.deepEqual(flat, [
    {
      path: 'colors.red',
      pointer: '#/colors/red',
      value: '#ff0000',
      type: 'color',
      metadata: { loc: { line: 1, column: 1 } },
    },
    {
      path: 'colors.accent',
      pointer: '#/colors/accent',
      value: '#00ff00',
      type: 'special',
      metadata: { loc: { line: 1, column: 1 } },
    },
    {
      path: 'colors.nested.green',
      pointer: '#/colors/nested/green',
      value: '#00ff00',
      type: 'color',
      metadata: { loc: { line: 1, column: 1 } },
    },
    {
      path: 'size.spacing.small',
      pointer: '#/size/spacing/small',
      value: { dimensionType: 'length', value: 4, unit: 'px' },
      type: 'dimension',
      metadata: { loc: { line: 1, column: 1 } },
    },
  ]);
});

void test('flattenDesignTokens preserves slash characters in token paths', () => {
  const tokens: DesignTokens = {
    icons: {
      $type: 'color',
      'icon/home': { $value: '#000000' },
      alias: { $ref: '#/icons/icon~1home' },
    },
  };

  const flat = flattenDesignTokens(tokens);
  const home = flat.find((token) => token.path === 'icons.icon/home');
  assert(home);
  assert.equal(home.pointer, '#/icons/icon~1home');
  const alias = flat.find((token) => token.path === 'icons.alias');
  if (!alias) {
    assert.fail('Expected icons.alias token');
  }
  assert.equal(alias.type, 'color');
  assert.deepEqual(alias.aliases, ['#/icons/icon~1home']);
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

void test('flattenDesignTokens resolves $ref references', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#fff' },
      primary: { $ref: '#/color/base' },
    },
  };
  const flat = flattenDesignTokens(tokens);
  assert.deepEqual(flat, [
    {
      path: 'color.base',
      pointer: '#/color/base',
      value: '#fff',
      type: 'color',
      metadata: { loc: { line: 1, column: 1 } },
    },
    {
      path: 'color.primary',
      pointer: '#/color/primary',
      value: '#fff',
      ref: '#/color/base',
      type: 'color',
      aliases: ['#/color/base'],
      metadata: { loc: { line: 1, column: 1 } },
    },
  ]);
});

void test('flattenDesignTokens rejects circular $ref chains', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $type: 'color', $ref: '#/color/b' },
      b: { $type: 'color', $ref: '#/color/a' },
    },
  };
  assert.throws(() => flattenDesignTokens(tokens), /circular \$ref reference/i);
});

void test('flattenDesignTokens rejects unknown $ref targets', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $type: 'color', $ref: '#/color/missing' },
    },
  };
  assert.throws(
    () => flattenDesignTokens(tokens),
    /references unknown token via \$ref/i,
  );
});

void test('flattenDesignTokens rejects invalid $ref fragments', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#fff' },
      primary: { $type: 'color', $ref: 'color/base' },
    },
  };
  assert.throws(() => flattenDesignTokens(tokens), /invalid \$ref/i);
});

void test('flattenDesignTokens applies name transforms', () => {
  const tokens: DesignTokens = {
    ColorGroup: {
      $type: 'color',
      primaryColor: { $value: '#000' },
      secondaryColor: { $ref: '#/ColorGroup/primaryColor' },
    },
  };
  const flat = flattenDesignTokens(tokens, { nameTransform: 'kebab-case' });
  assert.deepEqual(flat, [
    {
      path: 'color-group.primary-color',
      pointer: '#/ColorGroup/primaryColor',
      value: '#000',
      type: 'color',
      metadata: { loc: { line: 1, column: 1 } },
    },
    {
      path: 'color-group.secondary-color',
      pointer: '#/ColorGroup/secondaryColor',
      value: '#000',
      ref: '#/ColorGroup/primaryColor',
      type: 'color',
      aliases: ['#/ColorGroup/primaryColor'],
      metadata: { loc: { line: 1, column: 1 } },
    },
  ]);
});
