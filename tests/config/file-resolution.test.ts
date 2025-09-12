/**
 * Unit tests for resolveConfigFile.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { resolveConfigFile } from '../../src/config/file-resolution.js';

void test('returns null when config missing', async () => {
  const tmp = makeTmpDir();
  const result = await resolveConfigFile(tmp);
  assert.equal(result, null);
});

void test('finds config file in parent directories', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ tokens: {} }));
  const nested = path.join(tmp, 'nested');
  fs.mkdirSync(nested, { recursive: true });
  const result = await resolveConfigFile(nested);
  assert.ok(result?.filepath.endsWith('designlint.config.json'));
});

void test('loads explicit config path', async () => {
  const tmp = makeTmpDir();
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ tokens: {} }));
  const result = await resolveConfigFile(tmp, 'designlint.config.json');
  assert.equal(result?.filepath, configPath);
});

void test('throws when explicit config path missing', async () => {
  const tmp = makeTmpDir();
  await assert.rejects(
    resolveConfigFile(tmp, 'designlint.config.json'),
    /Config file not found/,
  );
});
