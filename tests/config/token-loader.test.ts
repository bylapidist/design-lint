/**
 * Unit tests for loadTokens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { loadTokens } from '../../src/config/token-loader.js';

const black = { colorSpace: 'srgb', components: [0, 0, 0] } as const;
const nearWhite = { colorSpace: 'srgb', components: [1, 1, 1] } as const;
const charcoal = {
  colorSpace: 'srgb',
  components: [0.133, 0.133, 0.133],
} as const;

void test('reads token files', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({
      color: {
        primary: { $type: 'color', $value: black },
      },
    }),
  );
  const tokens = await loadTokens({ light: './light.tokens.json' }, tmp);
  const light = tokens.light as {
    color: { primary: { $value: typeof black } };
  };
  assert.deepEqual(light.color.primary.$value, black);
});

void test('propagates parsing errors', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'bad.tokens.json'),
    JSON.stringify({ color: { primary: { $type: 'color' } } }),
  );
  await assert.rejects(
    loadTokens({ light: './bad.tokens.json' }, tmp),
    /DTIF validation failed/i,
  );
});

void test('includes theme when token file missing', async () => {
  const tmp = makeTmpDir();
  await assert.rejects(
    loadTokens({ light: './missing.tokens.json' }, tmp),
    /Failed to read tokens for theme "light"/,
  );
});

void test('parses inline design tokens object', async () => {
  const tokens = await loadTokens(
    { color: { primary: { $type: 'color', $value: black } } },
    process.cwd(),
  );
  const color = tokens.color as { primary: { $value: typeof black } };
  assert.deepEqual(color.primary.$value, black);
});

void test('retains metadata on inline tokens', async () => {
  const tokens = await loadTokens(
    {
      $schema: 'https://dtif.lapidist.net/schema/core.json',
      color: { primary: { $type: 'color', $value: black } },
    },
    process.cwd(),
  );
  const color = tokens.color as { primary: { $value: typeof black } };
  assert.deepEqual(color.primary.$value, black);
  const meta = tokens as { $schema: string };
  assert.equal(meta.$schema, 'https://dtif.lapidist.net/schema/core.json');
});

void test('parses inline theme record', async () => {
  const tokens = await loadTokens(
    {
      light: { color: { primary: { $type: 'color', $value: black } } },
      dark: { color: { primary: { $type: 'color', $value: charcoal } } },
    },
    process.cwd(),
  );
  const light = tokens.light as {
    color: { primary: { $value: typeof black } };
  };
  assert.deepEqual(light.color.primary.$value, black);
});

void test('merges variant tokens over default', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'base.tokens.json'),
    JSON.stringify({
      $description: 'base',
      color: {
        primary: { $type: 'color', $value: black },
        secondary: { $type: 'color', $value: charcoal },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, 'dark.tokens.json'),
    JSON.stringify({
      $description: 'dark',
      color: { primary: { $type: 'color', $value: nearWhite } },
    }),
  );
  const tokens = await loadTokens(
    { default: './base.tokens.json', dark: './dark.tokens.json' },
    tmp,
  );
  const dark = tokens.dark as {
    $description: string;
    color: {
      primary: { $value: typeof nearWhite };
      secondary: { $value: typeof charcoal };
    };
  };
  assert.deepEqual(dark.color.primary.$value, nearWhite);
  assert.deepEqual(dark.color.secondary.$value, charcoal);
  assert.equal(dark.$description, 'dark');
  const base = tokens.default as {
    $description: string;
    color: { primary: { $value: typeof black } };
  };
  assert.deepEqual(base.color.primary.$value, black);
  assert.equal(base.$description, 'base');
});

void test('returns empty object for non-record input', async () => {
  const tokens = await loadTokens(null, process.cwd());
  assert.deepEqual(tokens, {});
});
