/**
 * Unit tests for loadTokens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { loadTokens } from '../../src/config/token-loader.js';

void test('reads token files', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'light.tokens.json'),
    JSON.stringify({ color: { primary: { $type: 'color', $value: '#000' } } }),
  );
  const tokens = await loadTokens({ light: './light.tokens.json' }, tmp);
  const light = tokens.light as { color: { primary: { $value: string } } };
  assert.equal(light.color.primary.$value, '#000');
});

void test('propagates parsing errors', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'bad.tokens.json'),
    JSON.stringify({ color: { primary: { $type: 'color' } } }),
  );
  await assert.rejects(
    loadTokens({ light: './bad.tokens.json' }, tmp),
    /must be an object with \$value or \$ref/i,
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
    { color: { primary: { $type: 'color', $value: '#000' } } },
    process.cwd(),
  );
  const color = tokens.color as { primary: { $value: string } };
  assert.equal(color.primary.$value, '#000');
});

void test('retains metadata on inline tokens', async () => {
  const tokens = await loadTokens(
    {
      $schema: 'https://design-tokens.org',
      color: { primary: { $type: 'color', $value: '#000' } },
    },
    process.cwd(),
  );
  const color = tokens.color as { primary: { $value: string } };
  assert.equal(color.primary.$value, '#000');
  const meta = tokens as { $schema: string };
  assert.equal(meta.$schema, 'https://design-tokens.org');
});

void test('parses inline theme record', async () => {
  const tokens = await loadTokens(
    {
      light: { color: { primary: { $type: 'color', $value: '#000' } } },
      dark: { color: { primary: { $type: 'color', $value: '#111' } } },
    },
    process.cwd(),
  );
  const light = tokens.light as { color: { primary: { $value: string } } };
  assert.equal(light.color.primary.$value, '#000');
});

void test('merges variant tokens over default', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'base.tokens.json'),
    JSON.stringify({
      $description: 'base',
      color: {
        primary: { $type: 'color', $value: '#000' },
        secondary: { $type: 'color', $value: '#222' },
      },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, 'dark.tokens.json'),
    JSON.stringify({
      $description: 'dark',
      color: { primary: { $type: 'color', $value: '#111' } },
    }),
  );
  const tokens = await loadTokens(
    { default: './base.tokens.json', dark: './dark.tokens.json' },
    tmp,
  );
  const dark = tokens.dark as {
    $description: string;
    color: {
      primary: { $value: string };
      secondary: { $value: string };
    };
  };
  assert.equal(dark.color.primary.$value, '#111');
  assert.equal(dark.color.secondary.$value, '#222');
  assert.equal(dark.$description, 'dark');
  const base = tokens.default as {
    $description: string;
    color: { primary: { $value: string } };
  };
  assert.equal(base.color.primary.$value, '#000');
  assert.equal(base.$description, 'base');
});

void test('returns empty object for non-record input', async () => {
  const tokens = await loadTokens(null, process.cwd());
  assert.deepEqual(tokens, {});
});
