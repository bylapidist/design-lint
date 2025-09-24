import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens, DtifFlattenedToken } from '../../src/core/types.js';
import { flattenDesignTokens } from '../../src/utils/tokens/index.js';
import { attachDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';
import {
  getTokenPath,
  pointerToTokenPath,
} from '../../src/utils/tokens/token-view.js';

const documentUri = new URL('memory://flatten-design-tokens.test.json');

const backgroundToken: DtifFlattenedToken = {
  id: '#/color/button/background',
  pointer: '#/color/button/background',
  path: ['color', 'button', 'background'],
  name: 'background',
  type: 'color',
  value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
  raw: { colorSpace: 'srgb', components: [0, 0.435, 1] },
  metadata: {
    description: 'Solid brand fill',
    extensions: { 'org.example.export': { legacyHex: '#006FFF' } },
  },
  resolution: {
    id: '#/color/button/background',
    type: 'color',
    value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
    raw: { colorSpace: 'srgb', components: [0, 0.435, 1] },
    references: [],
    resolutionPath: [
      { uri: documentUri.toString(), pointer: '#/color/button/background' },
    ],
    appliedAliases: [],
  },
};

const aliasToken: DtifFlattenedToken = {
  id: '#/color/button/text',
  pointer: '#/color/button/text',
  path: ['color', 'button', 'text'],
  name: 'text',
  type: 'color',
  value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
  raw: { colorSpace: 'srgb', components: [0, 0.435, 1] },
  metadata: {
    description: 'Alias to the background color',
    extensions: {},
    deprecated: {
      supersededBy: {
        uri: documentUri.toString(),
        pointer: '#/typography/button/text',
      },
    },
  },
  resolution: {
    id: '#/color/button/text',
    type: 'color',
    value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
    raw: { colorSpace: 'srgb', components: [0, 0.435, 1] },
    references: [
      { uri: documentUri.toString(), pointer: '#/color/button/background' },
      {
        uri: documentUri.toString(),
        pointer: '#/color/button/background/$value',
      },
    ],
    resolutionPath: [
      { uri: documentUri.toString(), pointer: '#/color/button/text' },
      { uri: documentUri.toString(), pointer: '#/color/button/background' },
    ],
    appliedAliases: [
      { uri: documentUri.toString(), pointer: '#/color/button/text' },
    ],
  },
};

void test('flattenDesignTokens returns canonical DTIF entries', () => {
  const tokens = [backgroundToken, aliasToken] as const;
  const flat = flattenDesignTokens(tokens);

  assert.equal(flat.length, 2);
  assert.strictEqual(flat[0], tokens[0]);
  assert.strictEqual(flat[1], tokens[1]);
});

void test('getTokenPath derives normalized names for DTIF tokens', () => {
  const primaryToken: DtifFlattenedToken = {
    id: '#/ColorGroup/PrimaryColor',
    pointer: '#/ColorGroup/PrimaryColor',
    path: ['ColorGroup', 'PrimaryColor'],
    name: 'PrimaryColor',
    type: 'color',
    value: '#ff0000',
    raw: '#ff0000',
    metadata: { extensions: {} },
    resolution: {
      id: '#/ColorGroup/PrimaryColor',
      type: 'color',
      value: '#ff0000',
      raw: '#ff0000',
      references: [],
      resolutionPath: [
        {
          uri: documentUri.toString(),
          pointer: '#/ColorGroup/PrimaryColor',
        },
      ],
      appliedAliases: [],
    },
  };
  const alias: DtifFlattenedToken = {
    id: '#/ColorGroup/SecondaryColor',
    pointer: '#/ColorGroup/SecondaryColor',
    path: ['ColorGroup', 'SecondaryColor'],
    name: 'SecondaryColor',
    type: 'color',
    value: '#ff0000',
    raw: '#ff0000',
    metadata: { extensions: {} },
    resolution: {
      id: '#/ColorGroup/SecondaryColor',
      type: 'color',
      value: '#ff0000',
      raw: '#ff0000',
      references: [
        { uri: documentUri.toString(), pointer: '#/ColorGroup/PrimaryColor' },
        {
          uri: documentUri.toString(),
          pointer: '#/ColorGroup/PrimaryColor/$value',
        },
      ],
      resolutionPath: [
        {
          uri: documentUri.toString(),
          pointer: '#/ColorGroup/SecondaryColor',
        },
        { uri: documentUri.toString(), pointer: '#/ColorGroup/PrimaryColor' },
      ],
      appliedAliases: [
        {
          uri: documentUri.toString(),
          pointer: '#/ColorGroup/SecondaryColor',
        },
      ],
    },
  };

  const flattened = flattenDesignTokens([primaryToken, alias]);
  const paths = flattened
    .map((token) => getTokenPath(token, 'kebab-case'))
    .sort();

  assert.deepEqual(paths, [
    'color-group.primary-color',
    'color-group.secondary-color',
  ]);

  const resolution = alias.resolution;
  assert(resolution);
  const target = resolution.resolutionPath.find(
    (step) => step.pointer === '#/ColorGroup/PrimaryColor',
  );
  assert(target);
  assert.equal(
    pointerToTokenPath(target.pointer, 'kebab-case'),
    'color-group.primary-color',
  );
});

void test('flattenDesignTokens reuses cached DTIF flattened tokens', () => {
  const document = { $version: '1.0.0' } as unknown as DesignTokens;
  attachDtifFlattenedTokens(document, [backgroundToken, aliasToken]);

  const flat = flattenDesignTokens(document);
  assert.equal(flat.length, 2);
  assert.strictEqual(flat[0], backgroundToken);
  assert.strictEqual(flat[1], aliasToken);
});

void test('flattenDesignTokens throws when document lacks cached DTIF tokens', () => {
  const document = { $version: '1.0.0' } as unknown as DesignTokens;

  assert.throws(() => flattenDesignTokens(document), /requires DTIF documents/);
});
