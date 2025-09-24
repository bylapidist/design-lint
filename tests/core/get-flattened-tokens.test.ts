import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens, DtifFlattenedToken } from '../../src/core/types.js';
import { getFlattenedTokens } from '../../src/utils/tokens/index.js';
import { attachDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';
import {
  getTokenPath,
  pointerToTokenPath,
} from '../../src/utils/tokens/token-view.js';

const paletteUri = new URL('memory://get-flattened-tokens.test.json');

const lightPrimary: DtifFlattenedToken = {
  id: '#/palette/primary',
  pointer: '#/palette/primary',
  path: ['palette', 'primary'],
  name: 'primary',
  type: 'color',
  value: '#ffffff',
  raw: '#ffffff',
  metadata: {
    extensions: {},
    deprecated: {
      supersededBy: {
        uri: paletteUri.toString(),
        pointer: '#/palette/secondary',
      },
    },
  },
};

const lightSecondary: DtifFlattenedToken = {
  id: '#/palette/secondary',
  pointer: '#/palette/secondary',
  path: ['palette', 'secondary'],
  name: 'secondary',
  type: 'color',
  value: '#000000',
  raw: '#000000',
  metadata: {
    extensions: { 'vendor.example': { note: true } },
  },
};

const aliasToken: DtifFlattenedToken = {
  id: '#/palette/primaryAlias',
  pointer: '#/palette/primaryAlias',
  path: ['palette', 'primaryAlias'],
  name: 'primaryAlias',
  type: 'color',
  value: '#ffffff',
  raw: '#ffffff',
  metadata: { extensions: {} },
  resolution: {
    id: '#/palette/primaryAlias',
    type: 'color',
    value: '#ffffff',
    raw: '#ffffff',
    references: [
      {
        uri: paletteUri.toString(),
        pointer: '#/palette/primary',
      },
    ],
    resolutionPath: [
      {
        uri: paletteUri.toString(),
        pointer: '#/palette/primaryAlias',
      },
      {
        uri: paletteUri.toString(),
        pointer: '#/palette/primary',
      },
    ],
    appliedAliases: [
      {
        uri: paletteUri.toString(),
        pointer: '#/palette/primaryAlias',
      },
    ],
  },
};

const darkSecondary: DtifFlattenedToken = {
  id: '#/palette/secondary',
  pointer: '#/palette/secondary',
  path: ['palette', 'secondary'],
  name: 'secondary',
  type: 'color',
  value: '#111111',
  raw: '#111111',
  metadata: { extensions: {} },
};

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
  assert.strictEqual(
    primary.metadata.deprecated?.supersededBy?.pointer,
    '#/palette/secondary',
  );

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
  const resolved = resolution.resolutionPath.find(
    (step) => step.pointer === '#/palette/primary',
  );
  assert(resolved);
  assert.equal(pointerToTokenPath(resolved.pointer), 'palette.primary');
});

void test('getFlattenedTokens applies name transforms', () => {
  const theme = { $version: '1.0.0' } as unknown as DesignTokens;
  const tokens: DtifFlattenedToken[] = [
    {
      id: '#/ColorGroup/PrimaryColor',
      pointer: '#/ColorGroup/PrimaryColor',
      path: ['ColorGroup', 'PrimaryColor'],
      name: 'PrimaryColor',
      type: 'color',
      value: '#fff',
      raw: '#fff',
      metadata: { extensions: {} },
    },
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
      {
        id: '#/ColorGroup/PrimaryColor',
        pointer: '#/ColorGroup/PrimaryColor',
        path: ['ColorGroup', 'PrimaryColor'],
        name: 'PrimaryColor',
        type: 'color',
        value: '#fff',
        raw: '#fff',
        metadata: { extensions: {} },
      },
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
