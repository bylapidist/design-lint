import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens, DtifFlattenedToken } from '../../src/core/types.js';
import { getFlattenedTokens } from '../../src/utils/tokens/index.js';
import { attachDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';
import {
  getTokenPath,
  pointerToTokenPath,
} from '../../src/utils/tokens/token-view.js';
import { createDtifToken } from '../helpers/dtif.js';

const paletteUri = new URL('memory://get-flattened-tokens.test.json');
const paletteSource = paletteUri.toString();

const lightPrimary = createDtifToken('palette.primary', {
  type: 'color',
  value: '#ffffff',
  metadata: {
    deprecated: {
      supersededBy: { pointer: '#/palette/secondary', uri: paletteSource },
    },
    source: { uri: paletteSource, line: 4, column: 5 },
  },
});

const lightSecondary = createDtifToken('palette.secondary', {
  type: 'color',
  value: '#000000',
  metadata: {
    extensions: { 'vendor.example': { note: true } },
    source: { uri: paletteSource, line: 6, column: 5 },
  },
});

const aliasToken = createDtifToken('palette.primaryAlias', {
  type: 'color',
  value: '#ffffff',
  resolution: {
    id: '#/palette/primaryAlias',
    type: 'color',
    value: '#ffffff',
    raw: '#ffffff',
    references: [{ uri: paletteSource, pointer: '#/palette/primary' }],
    resolutionPath: [
      { uri: paletteSource, pointer: '#/palette/primary' },
      { uri: paletteSource, pointer: '#/palette/primaryAlias' },
    ],
    appliedAliases: [{ uri: paletteSource, pointer: '#/palette/primary' }],
  },
  metadata: {
    source: { uri: paletteSource, line: 8, column: 5 },
  },
});

const darkSecondary = createDtifToken('palette.secondary', {
  type: 'color',
  value: '#111111',
  metadata: {
    source: { uri: paletteSource, line: 12, column: 5 },
  },
});

void test('getFlattenedTokens flattens tokens for specified theme and preserves metadata', () => {
  const light = { $version: '1.0.0' } as unknown as DesignTokens;
  attachDtifFlattenedTokens(light, [lightPrimary, lightSecondary]);

  const dtifTokens = getFlattenedTokens({ light }, 'light');
  assert.deepEqual(
    dtifTokens.map((token) => getTokenPath(token)),
    ['palette.primary', 'palette.secondary'],
  );

  const primary = dtifTokens.find(
    (token) => token.pointer === '#/palette/primary',
  );
  assert(primary);
  assert.equal(
    primary.metadata.deprecated?.supersededBy?.pointer,
    '#/palette/secondary',
  );
  assert.deepEqual(primary.metadata.source, {
    uri: paletteSource,
    line: 4,
    column: 5,
  });

  const secondary = dtifTokens.find(
    (token) => token.pointer === '#/palette/secondary',
  );
  assert(secondary);
  assert.deepEqual(secondary.metadata.extensions, {
    'vendor.example': { note: true },
  });
});

void test('getFlattenedTokens merges tokens from all themes when none is specified', () => {
  const light = { $version: '1.0.0' } as unknown as DesignTokens;
  attachDtifFlattenedTokens(light, [lightPrimary]);
  const dark = { $version: '1.0.0' } as unknown as DesignTokens;
  attachDtifFlattenedTokens(dark, [darkSecondary]);

  const dtifTokens = getFlattenedTokens({ light, dark });
  const paths = dtifTokens.map((token) => getTokenPath(token)).sort();
  assert.deepEqual(paths, ['palette.primary', 'palette.secondary']);
});

void test('getFlattenedTokens resolves aliases', () => {
  const theme = { $version: '1.0.0' } as unknown as DesignTokens;
  attachDtifFlattenedTokens(theme, [lightPrimary, aliasToken]);

  const dtifTokens = getFlattenedTokens({ default: theme }, 'default');
  const alias = dtifTokens.find(
    (token) => token.pointer === '#/palette/primaryAlias',
  );
  assert(alias);
  const resolution = alias.resolution;
  assert(resolution);
  const pathStep = resolution.resolutionPath.find(
    (step) => step.pointer === '#/palette/primary',
  );
  assert(pathStep);
  assert.equal(pointerToTokenPath(pathStep.pointer), 'palette.primary');
});

void test('getFlattenedTokens applies name transforms', () => {
  const theme = { $version: '1.0.0' } as unknown as DesignTokens;
  const tokens: DtifFlattenedToken[] = [
    createDtifToken('ColorGroup.PrimaryColor', {
      type: 'color',
      value: '#fff',
    }),
  ];
  attachDtifFlattenedTokens(theme, tokens);

  const dtifTokens = getFlattenedTokens({ theme }, undefined, {
    nameTransform: 'camelCase',
  });
  const paths = dtifTokens.map((token) => getTokenPath(token, 'camelCase'));
  assert.deepEqual(paths, ['colorGroup.primaryColor']);
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
    /Expected DTIF token documents or pre-flattened DTIF tokens/i,
  );
});

void test('getFlattenedTokens accepts flattened DTIF tokens', () => {
  const tokens: Record<string, readonly DtifFlattenedToken[]> = {
    default: [
      createDtifToken('ColorGroup.PrimaryColor', {
        type: 'color',
        value: '#fff',
      }),
    ],
  };

  const flat = getFlattenedTokens(tokens, 'default', {
    nameTransform: 'camelCase',
  });

  assert.equal(flat.length, 1);
  assert.strictEqual(flat[0], tokens.default[0]);

  const [token] = flat;
  assert(token);
  assert.equal(getTokenPath(token, 'camelCase'), 'colorGroup.primaryColor');
  assert.equal(token.value, '#fff');
  assert.equal(token.type, 'color');
});
