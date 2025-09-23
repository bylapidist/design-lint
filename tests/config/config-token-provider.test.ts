/**
 * Unit tests for ConfigTokenProvider.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigTokenProvider } from '../../src/config/config-token-provider.js';
import type { Config } from '../../src/core/linter.js';
import { DtifTokenParseError } from '../../src/adapters/node/token-parser.js';

const srgb = (
  components: readonly [number, number, number],
): Record<string, unknown> => ({
  $type: 'color',
  $value: {
    colorSpace: 'srgb',
    components: [...components],
  },
});

const baseConfig = (): Config => ({
  tokens: {},
  rules: {},
  ignoreFiles: [],
  plugins: [],
});

void test('wraps single DTIF token set as default theme', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    $version: '1.0.0',
    color: { primary: srgb([0, 0, 0]) },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  const tokens = await provider.load();
  const light = tokens.default as {
    $version: string;
    color: { primary: { $value: { components: number[] } } };
  };
  assert.equal(light.$version, '1.0.0');
  assert.deepEqual(light.color.primary.$value.components, [0, 0, 0]);
});

void test('handles multiple DTIF themes', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    light: {
      $version: '1.0.0',
      color: { primary: srgb([0, 0, 0]) },
    },
    dark: {
      $version: '1.0.0',
      color: { primary: srgb([0.1, 0.1, 0.1]) },
    },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  const tokens = await provider.load();
  assert.deepEqual(Object.keys(tokens).sort(), ['dark', 'light']);
});

void test('rejects invalid token structures', async () => {
  const cfg = baseConfig();
  cfg.tokens = { foo: '#000' } as unknown as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  await assert.rejects(provider.load(), (err) => {
    return (
      err instanceof Error &&
      err.message.includes('expected DTIF token documents or theme records')
    );
  });
});

void test('includes theme in parse errors for theme records', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    light: {
      $version: '1.0.0',
      color: { primary: { $type: 'color' } },
    },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  await assert.rejects(provider.load(), (err) => {
    if (!(err instanceof DtifTokenParseError)) return false;
    return err.message.includes('inline tokens for theme "light"');
  });
});

void test('throws on invalid design token object', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    $version: '1.0.0',
    color: { primary: { $type: 'color' } },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  await assert.rejects(provider.load(), DtifTokenParseError);
});

void test('returns empty object when tokens missing', async () => {
  const cfg = baseConfig();
  // @ts-expect-error intentionally omit tokens
  delete cfg.tokens;
  const provider = new ConfigTokenProvider(cfg as unknown as Config);
  const tokens = await provider.load();
  assert.deepEqual(tokens, {});
});
