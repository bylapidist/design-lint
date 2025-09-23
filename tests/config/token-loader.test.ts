/**
 * Unit tests for loadTokens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { loadTokens } from '../../src/config/token-loader.js';
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

void test('reads token files', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: { primary: srgb([0, 0, 0]) },
    }),
  );
  const tokens = await loadTokens({ light: './light.tokens.json' }, tmp);
  const light = tokens.light as {
    color: {
      primary: { $value: { components: number[]; colorSpace: string } };
    };
  };
  assert.deepEqual(light.color.primary.$value.components, [0, 0, 0]);
  assert.equal(light.color.primary.$value.colorSpace, 'srgb');
});

void test('propagates parsing errors', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'bad.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: { primary: { $type: 'color' } },
    }),
  );
  await assert.rejects(
    loadTokens({ light: './bad.tokens.json' }, tmp),
    DtifTokenParseError,
  );
});

void test('includes theme when token file missing', async () => {
  const tmp = makeTmpDir();
  await assert.rejects(
    loadTokens({ light: './missing.tokens.json' }, tmp),
    DtifTokenParseError,
  );
});

void test('parses inline design tokens object', async () => {
  const tokens = await loadTokens(
    { $version: '1.0.0', color: { primary: srgb([0, 0, 0]) } },
    process.cwd(),
  );
  const color = tokens.color as {
    primary: { $value: { components: number[]; colorSpace: string } };
  };
  assert.deepEqual(color.primary.$value.components, [0, 0, 0]);
  assert.equal(color.primary.$value.colorSpace, 'srgb');
});

void test('retains metadata on inline tokens', async () => {
  const tokens = await loadTokens(
    {
      $version: '1.0.0',
      $description: 'inline metadata',
      color: { primary: srgb([0, 0, 0]) },
    },
    process.cwd(),
  );
  const color = tokens.color as {
    primary: { $value: { components: number[] } };
  };
  assert.deepEqual(color.primary.$value.components, [0, 0, 0]);
  const meta = tokens as { $description: string };
  assert.equal(meta.$description, 'inline metadata');
});

void test('parses inline theme record', async () => {
  const tokens = await loadTokens(
    {
      light: { $version: '1.0.0', color: { primary: srgb([0, 0, 0]) } },
      dark: {
        $version: '1.0.0',
        color: { primary: srgb([0.0666666667, 0.0666666667, 0.0666666667]) },
      },
    },
    process.cwd(),
  );
  const light = tokens.light as {
    color: { primary: { $value: { components: number[] } } };
  };
  assert.deepEqual(light.color.primary.$value.components, [0, 0, 0]);
  const dark = tokens.dark as {
    color: { primary: { $value: { components: number[] } } };
  };
  assert.deepEqual(
    dark.color.primary.$value.components,
    [0.0666666667, 0.0666666667, 0.0666666667],
  );
});

void test('merges variant tokens over default', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'base.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      $description: 'base',
      color: {
        primary: srgb([0, 0, 0]),
        secondary: srgb([0.1333333333, 0.1333333333, 0.1333333333]),
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, 'dark.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      $description: 'dark',
      color: { primary: srgb([0.0666666667, 0.0666666667, 0.0666666667]) },
    }),
  );
  const tokens = await loadTokens(
    { default: './base.tokens.json', dark: './dark.tokens.json' },
    tmp,
  );
  const dark = tokens.dark as {
    $description: string;
    color: {
      primary: { $value: { components: number[] } };
      secondary: { $value: { components: number[] } };
    };
  };
  assert.deepEqual(
    dark.color.primary.$value.components,
    [0.0666666667, 0.0666666667, 0.0666666667],
  );
  assert.deepEqual(
    dark.color.secondary.$value.components,
    [0.1333333333, 0.1333333333, 0.1333333333],
  );
  assert.equal(dark.$description, 'dark');
  const base = tokens.default as {
    $description: string;
    color: { primary: { $value: { components: number[] } } };
  };
  assert.deepEqual(base.color.primary.$value.components, [0, 0, 0]);
  assert.equal(base.$description, 'base');
});

void test('returns empty object for non-record input', async () => {
  const tokens = await loadTokens(null, process.cwd());
  assert.deepEqual(tokens, {});
});
