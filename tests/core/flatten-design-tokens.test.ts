import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens, DtifFlattenedToken } from '../../src/core/types.js';
import { flattenDesignTokens } from '../../src/utils/tokens/index.js';
import { attachDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';

const documentUri = new URL('memory://flatten-design-tokens.test.json');

const backgroundToken: DtifFlattenedToken = {
  pointer: '#/color/button/background',
  segments: ['color', 'button', 'background'],
  name: 'background',
  type: 'color',
  value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
  metadata: {
    description: 'Solid brand fill',
    extensions: { 'org.example.export': { legacyHex: '#006FFF' } },
  },
  resolution: {
    pointer: '#/color/button/background',
    trace: [{ kind: 'token', pointer: '#/color/button/background' }],
  },
  location: {
    pointer: '#/color/button/background',
    span: {
      uri: documentUri,
      start: { line: 5, column: 3, offset: 42 },
      end: { line: 5, column: 28, offset: 67 },
    },
  },
};

const aliasToken: DtifFlattenedToken = {
  pointer: '#/color/button/text',
  segments: ['color', 'button', 'text'],
  name: 'text',
  type: 'color',
  value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
  metadata: {
    description: 'Alias to the background color',
    deprecated: { $replacement: '#/typography/button/text' },
  },
  resolution: {
    pointer: '#/color/button/text',
    trace: [
      { kind: 'token', pointer: '#/color/button/background' },
      { kind: 'token', pointer: '#/color/button/text' },
    ],
  },
  location: {
    pointer: '#/color/button/text',
    span: {
      uri: documentUri,
      start: { line: 6, column: 5, offset: 82 },
      end: { line: 6, column: 24, offset: 101 },
    },
  },
};

void test('flattenDesignTokens converts flattened DTIF tokens to legacy shape', () => {
  const flat = flattenDesignTokens([backgroundToken, aliasToken]);

  const background = flat.find(
    (token) => token.path === 'color.button.background',
  );
  assert(background);
  assert.equal(background.type, 'color');
  assert.deepEqual(background.value, {
    colorSpace: 'srgb',
    components: [0, 0.435, 1],
  });
  assert.equal(background.metadata.description, 'Solid brand fill');
  assert.deepEqual(background.metadata.loc, { line: 5, column: 3 });

  const alias = flat.find((token) => token.path === 'color.button.text');
  assert(alias);
  assert.equal(alias.type, 'color');
  assert.deepEqual(alias.aliases, ['color.button.background']);
  assert.deepEqual(alias.value, background.value);
  assert.deepEqual(alias.metadata.loc, { line: 6, column: 5 });
});

void test('flattenDesignTokens preserves DTIF metadata', () => {
  const flat = flattenDesignTokens([backgroundToken, aliasToken]);

  const background = flat.find(
    (token) => token.path === 'color.button.background',
  );
  assert(background);
  assert.deepEqual(background.metadata.extensions, {
    'org.example.export': { legacyHex: '#006FFF' },
  });

  const alias = flat.find((token) => token.path === 'color.button.text');
  assert(alias);
  assert.equal(alias.metadata.deprecated, '#/typography/button/text');
});

void test('flattenDesignTokens applies name transforms to DTIF tokens', () => {
  const primaryToken: DtifFlattenedToken = {
    pointer: '#/ColorGroup/PrimaryColor',
    segments: ['ColorGroup', 'PrimaryColor'],
    name: 'PrimaryColor',
    type: 'color',
    value: '#ff0000',
    metadata: {},
    resolution: {
      pointer: '#/ColorGroup/PrimaryColor',
      trace: [{ kind: 'token', pointer: '#/ColorGroup/PrimaryColor' }],
    },
  };
  const alias: DtifFlattenedToken = {
    pointer: '#/ColorGroup/SecondaryColor',
    segments: ['ColorGroup', 'SecondaryColor'],
    name: 'SecondaryColor',
    type: 'color',
    value: '#ff0000',
    metadata: {},
    resolution: {
      pointer: '#/ColorGroup/SecondaryColor',
      trace: [
        { kind: 'token', pointer: '#/ColorGroup/PrimaryColor' },
        { kind: 'token', pointer: '#/ColorGroup/SecondaryColor' },
      ],
    },
  };

  const flat = flattenDesignTokens([primaryToken, alias], {
    nameTransform: 'kebab-case',
  });

  assert.deepEqual(flat.map((token) => token.path).sort(), [
    'color-group.primary-color',
    'color-group.secondary-color',
  ]);

  const transformedAlias = flat.find(
    (token) => token.path === 'color-group.secondary-color',
  );
  assert(transformedAlias);
  assert.deepEqual(transformedAlias.aliases, ['color-group.primary-color']);
});

void test('flattenDesignTokens reuses cached DTIF flattened tokens', () => {
  const document = { $version: '1.0.0' } as unknown as DesignTokens;
  attachDtifFlattenedTokens(document, [backgroundToken, aliasToken]);

  const flat = flattenDesignTokens(document);
  const paths = flat.map((token) => token.path).sort();
  assert.deepEqual(paths, ['color.button.background', 'color.button.text']);
});

void test('flattenDesignTokens throws when document lacks cached DTIF tokens', () => {
  const document = { $version: '1.0.0' } as unknown as DesignTokens;

  assert.throws(() => flattenDesignTokens(document), /requires DTIF documents/);
});
