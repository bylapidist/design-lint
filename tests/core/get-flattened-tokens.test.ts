import test from 'node:test';
import assert from 'node:assert/strict';

import type { DesignTokens, DtifFlattenedToken } from '../../src/core/types.js';
import { getFlattenedTokens } from '../../src/utils/tokens/index.js';
import { attachDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';

const paletteUri = new URL('memory://get-flattened-tokens.test.json');

const lightPrimary: DtifFlattenedToken = {
  pointer: '#/palette/primary',
  segments: ['palette', 'primary'],
  name: 'primary',
  type: 'color',
  value: '#ffffff',
  metadata: {
    deprecated: { $replacement: '#/palette/secondary' },
  },
  location: {
    pointer: '#/palette/primary',
    span: {
      uri: paletteUri,
      start: { line: 4, column: 5, offset: 32 },
      end: { line: 4, column: 20, offset: 47 },
    },
  },
};

const lightSecondary: DtifFlattenedToken = {
  pointer: '#/palette/secondary',
  segments: ['palette', 'secondary'],
  name: 'secondary',
  type: 'color',
  value: '#000000',
  metadata: {
    extensions: { 'vendor.example': { note: true } },
  },
};

const aliasToken: DtifFlattenedToken = {
  pointer: '#/palette/primaryAlias',
  segments: ['palette', 'primaryAlias'],
  name: 'primaryAlias',
  type: 'color',
  value: '#ffffff',
  metadata: {},
  resolution: {
    pointer: '#/palette/primaryAlias',
    trace: [
      { kind: 'token', pointer: '#/palette/primary' },
      { kind: 'token', pointer: '#/palette/primaryAlias' },
    ],
  },
};

const darkSecondary: DtifFlattenedToken = {
  pointer: '#/palette/secondary',
  segments: ['palette', 'secondary'],
  name: 'secondary',
  type: 'color',
  value: '#111111',
  metadata: {},
};

void test('getFlattenedTokens flattens tokens for specified theme and preserves metadata', () => {
  const light = { $version: '1.0.0' } as unknown as DesignTokens;
  attachDtifFlattenedTokens(light, [lightPrimary, lightSecondary]);

  const flat = getFlattenedTokens({ light }, 'light');
  assert.deepEqual(
    flat.map((token) => token.path),
    ['palette.primary', 'palette.secondary'],
  );

  const primary = flat.find((token) => token.path === 'palette.primary');
  assert(primary);
  assert.equal(primary.metadata.deprecated, '#/palette/secondary');
  assert.deepEqual(primary.metadata.loc, { line: 4, column: 5 });

  const secondary = flat.find((token) => token.path === 'palette.secondary');
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

  const flat = getFlattenedTokens({ light, dark });
  assert.deepEqual(flat.map((token) => token.path).sort(), [
    'palette.primary',
    'palette.secondary',
  ]);
});

void test('getFlattenedTokens resolves aliases', () => {
  const theme = { $version: '1.0.0' } as unknown as DesignTokens;
  attachDtifFlattenedTokens(theme, [lightPrimary, aliasToken]);

  const flat = getFlattenedTokens({ default: theme }, 'default');
  const alias = flat.find((token) => token.path === 'palette.primaryAlias');
  assert(alias);
  assert.deepEqual(alias.aliases, ['palette.primary']);
});

void test('getFlattenedTokens applies name transforms', () => {
  const theme = { $version: '1.0.0' } as unknown as DesignTokens;
  const tokens: DtifFlattenedToken[] = [
    {
      pointer: '#/ColorGroup/PrimaryColor',
      segments: ['ColorGroup', 'PrimaryColor'],
      name: 'PrimaryColor',
      type: 'color',
      value: '#fff',
      metadata: {},
    },
  ];
  attachDtifFlattenedTokens(theme, tokens);

  const flat = getFlattenedTokens({ theme }, undefined, {
    nameTransform: 'camelCase',
  });
  assert.deepEqual(
    flat.map((token) => token.path),
    ['colorGroup.primaryColor'],
  );
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
        pointer: '#/ColorGroup/PrimaryColor',
        segments: ['ColorGroup', 'PrimaryColor'],
        name: 'PrimaryColor',
        type: 'color',
        value: '#fff',
        metadata: {},
      },
    ],
  };

  const flat = getFlattenedTokens(tokens, 'default', {
    nameTransform: 'camelCase',
  });

  assert.deepEqual(flat, [
    {
      path: 'colorGroup.primaryColor',
      value: '#fff',
      type: 'color',
      metadata: {
        description: undefined,
        extensions: undefined,
        deprecated: undefined,
        loc: { line: 1, column: 1 },
      },
    },
  ]);
});
