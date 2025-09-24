import test from 'node:test';
import assert from 'node:assert/strict';

import { NodeTokenProvider } from '../src/adapters/node/token-provider.js';
import { getDtifFlattenedTokens } from '../src/utils/tokens/dtif-cache.js';
import { createDtifTheme } from './helpers/dtif.js';
import type { DesignTokens } from '../src/core/types.js';

const tokens = {
  color: {
    primary: { $type: 'color', $value: '#fff' },
  },
};

const primitiveTokens = {
  spacing: {
    $type: 'dimension',
    small: '4px',
  },
};

void test('attaches flattened DTIF tokens when loading inline documents', async () => {
  const dtifTokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      base: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
  };

  const provider = new NodeTokenProvider(dtifTokens);
  const result = await provider.load();
  const cached = getDtifFlattenedTokens(result.default);
  assert(cached);
  assert(cached.length > 0);
  assert.equal(cached[0]?.pointer, '#/color/base');
});

void test('stores empty DTIF caches for documents without tokens', async () => {
  const emptyDocument: DesignTokens = { $version: '1.0.0' };
  const provider = new NodeTokenProvider(emptyDocument);
  const result = await provider.load();
  const cached = getDtifFlattenedTokens(result.default);
  assert(cached);
  assert.equal(cached.length, 0);
});

void test('wraps tokens in default theme when no theme map is provided', async () => {
  const provider = new NodeTokenProvider(tokens);
  const result = await provider.load();
  assert.deepEqual(result.default, tokens);
});

void test('wraps primitive token groups in default theme', async () => {
  const provider = new NodeTokenProvider(primitiveTokens);
  const result = await provider.load();
  assert.deepEqual(result.default, primitiveTokens);
});

void test('accepts explicit theme records without modification', async () => {
  const themes = { light: tokens, dark: tokens };
  const provider = new NodeTokenProvider(themes);
  const result = await provider.load();
  assert.deepEqual(result, themes);
});

void test('accepts theme records with tokens at the root', async () => {
  const themes = {
    light: { primary: { $type: 'color', $value: '#fff' } },
    dark: { primary: { $type: 'color', $value: '#000' } },
  };
  const provider = new NodeTokenProvider(themes);
  const result = await provider.load();
  assert.deepEqual(result, themes);
});

void test('accepts theme records created with createDtifTheme', async () => {
  const themes = {
    light: createDtifTheme({
      'color.primary': { type: 'color', value: '#fff' },
    }),
    dark: createDtifTheme({
      'color.primary': { type: 'color', value: '#000' },
    }),
  } as const;

  const provider = new NodeTokenProvider(themes);
  const result = await provider.load();

  assert.deepEqual(Object.keys(result).sort(), ['dark', 'light']);
  const cached = getDtifFlattenedTokens(result.light);
  assert(cached);
  assert.equal(cached.length, 1);
  assert.equal(cached[0]?.pointer, '#/color/primary');
});
