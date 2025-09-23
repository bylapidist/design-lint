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

void test('wraps DTIF token set as default theme', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.1, 0.2, 0.3],
        },
      },
    },
  } as Config['tokens'];

  const provider = new ConfigTokenProvider(cfg);
  const tokens = await provider.load();
  const light = tokens.default as {
    $version: string;
    color: {
      primary: {
        $value: { colorSpace: string; components: [number, number, number] };
      };
    };
  };

  assert.equal(light.$version, '1.0.0');
  assert.deepEqual(light.color.primary.$value, {
    colorSpace: 'srgb',
    components: [0.1, 0.2, 0.3],
  });
});

void test('handles multiple DTIF themes', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    light: {
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0, 0, 0],
          },
        },
      },
    },
    dark: {
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.5, 0.5, 0.5],
          },
        },
      },
    },
  } as Config['tokens'];

  const provider = new ConfigTokenProvider(cfg);
  const tokens = await provider.load();
  assert.deepEqual(Object.keys(tokens).sort(), ['dark', 'light']);

  const light = tokens.light as {
    $version: string;
    color: {
      primary: {
        $value: { colorSpace: string; components: [number, number, number] };
      };
    };
  };
  assert.equal(light.$version, '1.0.0');
  assert.deepEqual(light.color.primary.$value, {
    colorSpace: 'srgb',
    components: [0, 0, 0],
  });
});

void test('rejects legacy token structures', async () => {
  const cfg = baseConfig();
  cfg.tokens = { foo: '#000' } as unknown as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  await assert.rejects(() => provider.load(), /DTIF format/i);
});

void test('rejects legacy theme records', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    light: { color: { primary: { $type: 'color', $value: '#000' } } },
    dark: { color: { primary: { $type: 'color', $value: '#111' } } },
  } as Config['tokens'];

  const provider = new ConfigTokenProvider(cfg);
  await assert.rejects(
    () => provider.load(),
    (error: unknown) => {
      assert.match(String(error), /Failed to parse tokens for theme "light"/i);
      assert.match(String(error), /DTIF format/i);
      return true;
    },
  );
});

void test('includes theme in parse errors for theme records', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    light: {
      $version: '1.0.0',
      color: {
        primary: { $type: 'color' },
      },
    },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  await assert.rejects(
    () => provider.load(),
    /Failed to parse tokens for theme "light"/i,
  );
});

void test('throws on invalid DTIF design token object', async () => {
  const cfg = baseConfig();
  cfg.tokens = {
    $version: '1.0.0',
    color: {
      primary: { $type: 'color' },
    },
  } as Config['tokens'];
  const provider = new ConfigTokenProvider(cfg);
  await assert.rejects(
    () => provider.load(),
    /Failed to parse tokens for theme "color"/i,
  );
});

void test('returns empty object when tokens missing', async () => {
  const cfg = baseConfig();
  // @ts-expect-error intentionally omit tokens
  delete cfg.tokens;
  const provider = new ConfigTokenProvider(cfg as unknown as Config);
  const tokens = await provider.load();
  assert.deepEqual(tokens, {});
});
