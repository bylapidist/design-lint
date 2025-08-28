import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config/loader';

test('finds config in parent directories', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { colors: { primary: '#000' } } }),
  );
  const nested = path.join(tmp, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  const loaded = loadConfig(nested);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('throws on malformed JSON config', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, '{ invalid json');
  assert.throws(() => loadConfig(tmp), /Failed to load config/);
});

test('throws on malformed JS config', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(configPath, 'module.exports = { tokens: {},');
  assert.throws(() => loadConfig(tmp), /Failed to load config/);
});
