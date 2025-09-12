/**
 * Unit tests for {@link getFormatter} helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { helpers, jsonFormatter } from '../../../src/formatters/index.js';

const { getFormatter } = helpers;

void test('getFormatter returns formatter for valid name', async () => {
  assert.equal(await getFormatter('json'), jsonFormatter);
});

void test('getFormatter resolves formatter relative to cwd', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const prev = process.cwd();
  process.chdir(fixtureDir);
  try {
    const formatter = await getFormatter('./custom-formatter.ts');
    const out = formatter([{ sourceId: 'a', messages: [] }]);
    assert.equal(out, 'custom:1');
  } finally {
    process.chdir(prev);
  }
});
void test('getFormatter resolves formatter by absolute path', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const abs = join(fixtureDir, 'custom-formatter.ts');
  const formatter = await getFormatter(abs);
  const out = formatter([{ sourceId: 'a', messages: [] }]);
  assert.equal(out, 'custom:1');
});

void test('getFormatter resolves named formatter export', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const prev = process.cwd();
  process.chdir(fixtureDir);
  try {
    const formatter = await getFormatter('./named-formatter.ts');
    const out = formatter([{ sourceId: 'a', messages: [] }]);
    assert.equal(out, 'named:1');
  } finally {
    process.chdir(prev);
  }
});

void test('getFormatter throws for invalid name', async () => {
  await assert.rejects(() => getFormatter('unknown'), /Unknown formatter/);
});
