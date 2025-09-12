/**
 * Unit tests for parseTokensForTheme.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { DesignTokens } from '../../../src/core/types.js';
import { TokenParseError } from '../../../src/adapters/node/token-parser.js';
import { parseTokensForTheme } from '../../../src/utils/tokens/parse-tokens-for-theme.js';

void test('parses valid tokens', () => {
  const tokens: DesignTokens = {
    color: { $type: 'color', primary: { $value: '#000' } },
  };
  assert.doesNotThrow(() => {
    parseTokensForTheme('light', tokens);
  });
});

void test('rethrows TokenParseError', () => {
  const tokens = {
    color: { primary: { $value: '#000' } },
  } as unknown as DesignTokens;
  assert.throws(() => {
    parseTokensForTheme('light', tokens);
  }, TokenParseError);
});

void test('wraps unexpected errors', () => {
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
  assert.throws(() => {
    parseTokensForTheme('light', tokens);
  }, /Failed to parse tokens for theme "light": bad/);
});
