/**
 * Unit tests for parseTokensForTheme.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { DesignTokens } from '../../../src/core/types.js';
import { TokenParseError } from '../../../src/adapters/node/token-parser.js';
import { parseTokensForTheme } from '../../../src/utils/tokens/parse-tokens-for-theme.js';
import { DTIF_MIGRATION_MESSAGE } from '../../../src/core/dtif/messages.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('rejects legacy design tokens with migration guidance', async () => {
  const tokens = {
    color: { primary: { $type: 'color', $value: '#000000' } },
  } as unknown as DesignTokens;
  await assert.rejects(
    () => parseTokensForTheme('light', tokens),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.equal(error.message.includes(DTIF_MIGRATION_MESSAGE), true);
      return true;
    },
  );
});

void test('parses DTIF tokens', async () => {
  const tokens = {
    $version: '1.0.0',
    color: { primary: { $type: 'color', $value: srgb([0, 0, 0]) } },
  } as unknown as DesignTokens;
  await parseTokensForTheme('light', tokens);
});

void test('rethrows TokenParseError from DTIF parser', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0, 0] },
      },
    },
  } as unknown as DesignTokens;
  await assert.rejects(
    () => parseTokensForTheme('light', tokens),
    TokenParseError,
  );
});

void test('wraps unexpected errors', async () => {
  const tokens = new Proxy(
    {},
    {
      get() {
        throw new Error('bad');
      },
      ownKeys() {
        throw new Error('bad');
      },
      getOwnPropertyDescriptor() {
        throw new Error('bad');
      },
    },
  ) as unknown as DesignTokens;
  await assert.rejects(
    () => parseTokensForTheme('light', tokens),
    /Failed to parse tokens for theme "light": bad/,
  );
});

void test('wraps DTIF diagnostics when location missing', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [2] },
      },
    },
  } as unknown as DesignTokens;
  await assert.rejects(
    () => parseTokensForTheme('light', tokens),
    TokenParseError,
  );
});
