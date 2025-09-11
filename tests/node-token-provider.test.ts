import test from 'node:test';
import assert from 'node:assert/strict';

import { NodeTokenProvider } from '../src/adapters/node/token-provider.js';

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

void test('accepts theme records with primitive metadata fields', async () => {
  const themesWithMetadata = {
    light: tokens,
    dark: tokens,
    $metadata: { tokenSetOrder: ['light', 'dark'], version: 1 },
  };
  const provider = new NodeTokenProvider(themesWithMetadata);
  const result = await provider.load();
  assert.deepEqual(result, themesWithMetadata);
});
