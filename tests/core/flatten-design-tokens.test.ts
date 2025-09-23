import test from 'node:test';
import assert from 'node:assert/strict';

import { flattenDesignTokens } from '../../src/utils/tokens/index.js';
import { DtifDesignTokenError } from '../../src/core/parser/index.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('flattenDesignTokens flattens DTIF tokens with alias pointers', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
      alias: {
        $type: 'color',
        $ref: '#/color/base',
        $description: 'Alias pointer',
        $extensions: {
          'com.example.integration': { enabled: true },
        },
      },
    },
  } satisfies DesignTokens;

  const flat = await flattenDesignTokens(tokens);
  const byPath = new Map(flat.map((token) => [token.path, token]));

  const base = byPath.get('color.base');
  assert.ok(base, 'expected base token');
  assert.equal(base.type, 'color');
  assert.deepEqual(base.value, { colorSpace: 'srgb', components: [1, 0, 0] });

  const alias = byPath.get('color.alias');
  assert.ok(alias, 'expected alias token');
  assert.equal(alias.type, 'color');
  assert.deepEqual(alias.value, { colorSpace: 'srgb', components: [1, 0, 0] });
  assert.deepEqual(alias.aliases, ['color.base']);
  assert.equal(alias.metadata.description, 'Alias pointer');
  assert.deepEqual(alias.metadata.extensions, {
    'com.example.integration': { enabled: true },
  });
  assert.ok(alias.metadata.loc.line > 0);
  assert.ok(alias.metadata.loc.column > 0);
});

void test('flattenDesignTokens applies name transforms to JSON pointer paths', async () => {
  const tokens = {
    Theme: {
      PrimaryColor: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0.2, 0.3, 0.4] },
      },
      SecondaryColor: {
        $type: 'color',
        $ref: '#/Theme/PrimaryColor',
      },
    },
  } satisfies DesignTokens;

  const flat = await flattenDesignTokens(tokens, {
    nameTransform: 'kebab-case',
  });
  const paths = flat.map((token) => token.path).sort();
  assert.deepEqual(paths, ['theme.primary-color', 'theme.secondary-color']);
  const alias = flat.find((token) => token.path === 'theme.secondary-color');
  assert.ok(alias, 'expected alias token');
  assert.deepEqual(alias.aliases, ['theme.primary-color']);
});

void test('flattenDesignTokens normalizes colors when requested', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      swatch: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
  } satisfies DesignTokens;

  const [swatch] = await flattenDesignTokens(tokens, { colorSpace: 'hex' });
  assert.ok(swatch, 'expected swatch token');
  assert.equal(swatch.value, '#ff0000');
});

void test('flattenDesignTokens rejects documents with unresolved pointers', async () => {
  const invalidTokens = {
    $version: '1.0.0',
    color: {
      alias: {
        $type: 'color',
        $ref: '#/color/missing',
      },
    },
  } satisfies DesignTokens;

  await assert.rejects(
    () => flattenDesignTokens(invalidTokens),
    (error: unknown) => {
      assert.ok(error instanceof DtifDesignTokenError);
      assert.match(error.message, /Failed to parse DTIF design tokens/);
      return true;
    },
  );
});
