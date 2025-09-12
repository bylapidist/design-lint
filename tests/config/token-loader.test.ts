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
    /missing \$value/i,
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

void test('returns empty object for non-record input', async () => {
  const tokens = await loadTokens(null, process.cwd());
  assert.deepEqual(tokens, {});
});
