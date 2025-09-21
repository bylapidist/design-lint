/**
 * Unit tests for ConfigTokenProvider.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigTokenProvider } from '../../src/config/config-token-provider.js';
import type { Config } from '../../src/core/linter.js';

const baseConfig = (): Config => ({
  tokens: {},
  rules: {},
  ignoreFiles: [],
  plugins: [],
});

void test('wraps single token set as default theme', () => {
  const cfg = baseConfig();
  cfg.tokens = {
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
    },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  const tokens = provider.load();
  const light = tokens.default as {
    color: {
      primary: { $value: { colorSpace: string; components: number[] } };
    };
  };
  assert.deepEqual(light.color.primary.$value, {
    colorSpace: 'srgb',
    components: [0, 0, 0],
  });
});

void test('handles multiple themes', () => {
  const cfg = baseConfig();
  cfg.tokens = {
    light: {
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.066, 0.066, 0.066] },
        },
      },
    },
    dark: {
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.133, 0.133, 0.133] },
        },
      },
    },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  const tokens = provider.load();
  assert.deepEqual(Object.keys(tokens).sort(), ['dark', 'light']);
});

void test('rejects invalid token structures', () => {
  const cfg = baseConfig();
  cfg.tokens = { foo: '#000' } as unknown as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  assert.throws(() => provider.load(), /DTIF validation failed/i);
});

void test('includes theme in parse errors for theme records', () => {
  const cfg = baseConfig();
  cfg.tokens = {
    light: { color: { primary: { $type: 'color' } } },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  assert.throws(
    () => provider.load(),
    /Failed to parse tokens for theme "light"/i,
  );
});

void test('throws on invalid design token object', () => {
  const cfg = baseConfig();
  cfg.tokens = { color: { primary: { $type: 'color' } } } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  assert.throws(() => provider.load(), /DTIF validation failed/i);
});

void test('returns empty object when tokens missing', () => {
  const cfg = baseConfig();
  // @ts-expect-error intentionally omit tokens
  delete cfg.tokens;
  const provider = new ConfigTokenProvider(cfg as unknown as Config);
  const tokens = provider.load();
  assert.deepEqual(tokens, {});
});
