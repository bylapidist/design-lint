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

void test('flattenDesignTokens returns canonical DTIF entries', () => {
  const tokens = [backgroundToken, aliasToken] as const;
  const flat = flattenDesignTokens(tokens);

  assert.equal(flat.length, 2);
  assert.strictEqual(flat[0], tokens[0]);
  assert.strictEqual(flat[1], tokens[1]);
});

void test('getTokenPath derives normalized names for DTIF tokens', () => {
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
  const trace = resolution.trace;
  assert(trace);
  const aliasPointer = trace.find(
    (step) => step.kind === 'token' && step.pointer !== alias.pointer,
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
