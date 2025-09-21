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
      red: { $value: { colorSpace: 'srgb', components: [1, 0, 0] } },
      accent: {
        $value: { colorSpace: 'srgb', components: [0, 1, 0] },
        $type: 'special',
      },
      nested: {
        green: { $value: { colorSpace: 'srgb', components: [0, 0.5, 0.2] } },
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
      path: '/colors/red',
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
      path: '/colors/accent',
      value: { colorSpace: 'srgb', components: [0, 1, 0] },
      type: 'special',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: '/colors/nested/green',
      value: { colorSpace: 'srgb', components: [0, 0.5, 0.2] },
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: '/size/spacing/small',
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
    flat.find((t) => t.path === '/theme/base')?.metadata.extensions,
    ext,
  );
  assert.equal(
    flat.find((t) => t.path === '/theme/base')?.metadata.deprecated,
    true,
  );
  assert.equal(
    flat.find((t) => t.path === '/theme/active')?.metadata.deprecated,
    false,
  );
});

void test('flattenDesignTokens resolves alias references', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: { colorSpace: 'srgb', components: [1, 1, 1] } },
      primary: { $ref: '/color/base' },
    },
  };
  const flat = flattenDesignTokens(tokens);
  assert.deepEqual(flat, [
    {
      path: '/color/base',
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
      path: '/color/primary',
      value: { colorSpace: 'srgb', components: [1, 1, 1] },
      type: 'color',
      ref: '/color/base',
      aliases: ['/color/base'],
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});

void test('flattenDesignTokens preserves fallback candidates', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: { colorSpace: 'srgb', components: [1, 1, 1] } },
      brand: {
        $type: 'color',
        $value: [
          { $ref: '/color/base' },
          { colorSpace: 'srgb', components: [0, 0, 0] },
        ],
      },
    },
  };
  const flat = flattenDesignTokens(tokens);
  const brand = flat.find((t) => t.path === '/color/brand');
  assert(brand);
  assert.deepEqual(brand.candidates, [
    {
      ref: '/color/base',
      value: { colorSpace: 'srgb', components: [1, 1, 1] },
    },
    {
      value: { colorSpace: 'srgb', components: [0, 0, 0] },
    },
  ]);
});

void test('flattenDesignTokens includes overrides and normalizes override pointers', () => {
  const tokens: DesignTokens = {
    Theme: {
      $type: 'color',
      BaseSwatch: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
      Accent: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0.6, 0.2, 0.2] },
      },
    },
    Component: {
      $type: 'color',
      ButtonStyles: {
        PrimaryTone: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.8, 0.8, 0.8] },
        },
      },
    },
    $overrides: [
      {
        $token: '/Component/ButtonStyles/PrimaryTone',
        $when: { mode: 'dark' },
        $ref: '/Theme/BaseSwatch',
        $fallback: [
          { $ref: '/Theme/Accent' },
          { $value: { colorSpace: 'srgb', components: [0.4, 0.4, 0.4] } },
        ],
      },
    ],
  };

  const flat = flattenDesignTokens(tokens, { nameTransform: 'kebab-case' });
  const primary = flat.find(
    (t) => t.path === '/component/button-styles/primary-tone',
  );
  assert(primary);
  assert(primary.overrides);
  assert.equal(primary.overrides.length, 1);
  const [override] = primary.overrides;
  assert.deepEqual(override.source, '/$overrides/0');
  assert.deepEqual(override.when, { mode: 'dark' });
  assert.equal(override.ref, '/theme/base-swatch');
  assert.deepEqual(override.value, {
    colorSpace: 'srgb',
    components: [0, 0, 0],
  });
  assert.deepEqual(override.fallback, [
    {
      ref: '/theme/accent',
      value: { colorSpace: 'srgb', components: [0.6, 0.2, 0.2] },
    },
    { value: { colorSpace: 'srgb', components: [0.4, 0.4, 0.4] } },
  ]);
});

void test('flattenDesignTokens rejects circular aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $ref: '/color/b' },
      b: { $ref: '/color/a' },
    },
  };
  assert.throws(() => flattenDesignTokens(tokens), /circular \$ref chain/i);
});

void test('flattenDesignTokens rejects unknown aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      a: { $ref: '/color/missing' },
    },
  };
  assert.throws(() => flattenDesignTokens(tokens), /references unknown token/i);
});

void test('flattenDesignTokens rejects invalid JSON Pointer aliases', () => {
  const tokens: DesignTokens = {
    color: {
      $type: 'color',
      base: { $value: '#fff' },
      primary: { $ref: 'color/base' },
    },
  };
  assert.throws(() => flattenDesignTokens(tokens), /invalid \$ref/i);
});

void test('flattenDesignTokens applies name transforms', () => {
  const tokens: DesignTokens = {
    ColorGroup: {
      $type: 'color',
      primaryColor: { $value: { colorSpace: 'srgb', components: [0, 0, 0] } },
      secondaryColor: { $ref: '/ColorGroup/primaryColor' },
    },
  };
  const flat = flattenDesignTokens(tokens, { nameTransform: 'kebab-case' });
  assert.deepEqual(flat, [
    {
      path: '/color-group/primary-color',
      value: { colorSpace: 'srgb', components: [0, 0, 0] },
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
    {
      path: '/color-group/secondary-color',
      value: { colorSpace: 'srgb', components: [0, 0, 0] },
      type: 'color',
      ref: '/color-group/primary-color',
      aliases: ['/color-group/primary-color'],
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});
