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
    color: { primary: { $type: 'color', $value: '#000' } },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  const tokens = provider.load();
  const light = tokens.default as { color: { primary: { $value: string } } };
  assert.equal(light.color.primary.$value, '#000');
});

void test('handles multiple themes', () => {
  const cfg = baseConfig();
  cfg.tokens = {
    light: { color: { primary: { $type: 'color', $value: '#111' } } },
    dark: { color: { primary: { $type: 'color', $value: '#222' } } },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  const tokens = provider.load();
  assert.deepEqual(Object.keys(tokens).sort(), ['dark', 'light']);
});

void test('rejects invalid token structures', () => {
  const cfg = baseConfig();
  cfg.tokens = { foo: '#000' } as unknown as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  assert.throws(() => provider.load(), /must be an object with \$value/);
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
  assert.throws(
    () => provider.load(),
    /must be an object with \$value or \$ref/i,
  );
});

void test('returns empty object when tokens missing', () => {
  const cfg = baseConfig();
  // @ts-expect-error intentionally omit tokens
  delete cfg.tokens;
  const provider = new ConfigTokenProvider(cfg as unknown as Config);
  const tokens = provider.load();
  assert.deepEqual(tokens, {});
});
