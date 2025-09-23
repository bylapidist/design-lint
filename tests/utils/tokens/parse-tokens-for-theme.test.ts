/**
 * Unit tests for parseTokensForTheme.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { DesignTokens } from '../../../src/core/types.js';
import { DtifTokenParseError } from '../../../src/adapters/node/token-parser.js';
import { parseTokensForTheme } from '../../../src/utils/tokens/parse-tokens-for-theme.js';

const srgb = (
  components: readonly [number, number, number],
): Record<string, unknown> => ({
  $type: 'color',
  $value: {
    colorSpace: 'srgb',
    components: [...components],
  },
});

void test('parses valid DTIF tokens', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      primary: srgb([0, 0, 0]),
    },
  };
  const result = await parseTokensForTheme('light', tokens);
  assert.ok(result.flattened);
  const [token] = result.flattened;
  assert(token);
  assert.equal(token.pointer, '#/color/primary');
});

void test('rethrows DtifTokenParseError', async () => {
  const tokens = {
    $version: '1.0.0',
    color: { primary: { $type: 'color' } },
  } as unknown as DesignTokens;
  await assert.rejects(
    parseTokensForTheme('light', tokens),
    DtifTokenParseError,
  );
});

void test('rejects legacy tokens', async () => {
  const tokens = {
    color: { primary: { $type: 'color', $value: '#000000' } },
  } as unknown as DesignTokens;
  await assert.rejects(
    parseTokensForTheme('light', tokens),
    DtifTokenParseError,
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
    parseTokensForTheme('light', tokens),
    /Failed to parse tokens for theme "light": bad/,
  );
});
