import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens } from '../../src/core/types.js';
import { flattenDesignTokens } from '../../src/utils/tokens/index.js';
import { attachDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';
import {
  getTokenPath,
  pointerToTokenPath,
} from '../../src/utils/tokens/token-view.js';
import { createDtifToken } from '../helpers/dtif.js';

const documentUri = new URL('memory://flatten-design-tokens.test.json');

const documentSource = documentUri.toString();

const backgroundToken = createDtifToken('color.button.background', {
  type: 'color',
  value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
  metadata: {
    description: 'Solid brand fill',
    extensions: { 'org.example.export': { legacyHex: '#006FFF' } },
    source: { uri: documentSource, line: 5, column: 3 },
  },
  resolution: {
    id: '#/color/button/background',
    type: 'color',
    value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
    raw: { colorSpace: 'srgb', components: [0, 0.435, 1] },
    references: [],
    resolutionPath: [
      { uri: documentSource, pointer: '#/color/button/background' },
    ],
    appliedAliases: [],
  },
});

const aliasToken = createDtifToken('color.button.text', {
  type: 'color',
  value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
  metadata: {
    description: 'Alias to the background color',
    deprecated: {
      supersededBy: {
        pointer: '#/typography/button/text',
        uri: documentSource,
      },
    },
    source: { uri: documentSource, line: 6, column: 5 },
  },
  resolution: {
    id: '#/color/button/text',
    type: 'color',
    value: { colorSpace: 'srgb', components: [0, 0.435, 1] },
    raw: { colorSpace: 'srgb', components: [0, 0.435, 1] },
    references: [{ uri: documentSource, pointer: '#/color/button/background' }],
    resolutionPath: [
      { uri: documentSource, pointer: '#/color/button/background' },
      { uri: documentSource, pointer: '#/color/button/text' },
    ],
    appliedAliases: [
      { uri: documentSource, pointer: '#/color/button/background' },
    ],
  },
});

void test('flattenDesignTokens returns canonical DTIF entries', () => {
  const tokens = [backgroundToken, aliasToken] as const;
  const flat = flattenDesignTokens(tokens);

  assert.equal(flat.length, 2);
  assert.strictEqual(flat[0], tokens[0]);
  assert.strictEqual(flat[1], tokens[1]);
});

void test('getTokenPath derives normalized names for DTIF tokens', () => {
  const primaryToken = createDtifToken('ColorGroup.PrimaryColor', {
    type: 'color',
    value: '#ff0000',
    resolution: {
      id: '#/ColorGroup/PrimaryColor',
      type: 'color',
      value: '#ff0000',
      raw: '#ff0000',
      references: [],
      resolutionPath: [
        { uri: documentSource, pointer: '#/ColorGroup/PrimaryColor' },
      ],
      appliedAliases: [],
    },
  });
  const alias = createDtifToken('ColorGroup.SecondaryColor', {
    type: 'color',
    value: '#ff0000',
    resolution: {
      id: '#/ColorGroup/SecondaryColor',
      type: 'color',
      value: '#ff0000',
      raw: '#ff0000',
      references: [
        { uri: documentSource, pointer: '#/ColorGroup/PrimaryColor' },
      ],
      resolutionPath: [
        { uri: documentSource, pointer: '#/ColorGroup/PrimaryColor' },
        { uri: documentSource, pointer: '#/ColorGroup/SecondaryColor' },
      ],
      appliedAliases: [
        { uri: documentSource, pointer: '#/ColorGroup/PrimaryColor' },
      ],
    },
  });

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
  const aliasPointer = resolution.resolutionPath.find(
    (step) => step.pointer !== alias.pointer,
  );
  assert(aliasPointer);
  assert.equal(
    pointerToTokenPath(aliasPointer.pointer, 'kebab-case'),
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
