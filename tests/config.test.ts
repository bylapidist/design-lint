import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config/loader';
import { Linter } from '../src/core/engine';

test('finds config in parent directories', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { colors: { primary: '#000' } } }),
  );
  const nested = path.join(tmp, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  const loaded = await loadConfig(nested);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('throws on malformed JSON config', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, '{ invalid json');
  await assert.rejects(loadConfig(tmp), /Failed to load config/);
});

test('throws on malformed JS config', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(configPath, 'module.exports = { tokens: {},');
  await assert.rejects(loadConfig(tmp), /Failed to load config/);
});

test('throws on invalid tokens', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { colors: { primary: 123 } } }),
  );
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

test('throws on invalid rule setting', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ rules: { 'design-token/colors': 'invalid' } }),
  );
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

test('throws on invalid plugin path', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(configPath, JSON.stringify({ plugins: [123] }));
  await assert.rejects(loadConfig(tmp), /Invalid config/);
});

test('loads config from .mjs', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(
    configPath,
    "export default { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads async config from .mjs', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.mjs');
  fs.writeFileSync(
    configPath,
    "export default await Promise.resolve({ tokens: { colors: { primary: '#000' } } });",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads config from .ts', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.ts');
  fs.writeFileSync(
    configPath,
    "module.exports = { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test('loads config when package.json type module', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.writeFileSync(
    path.join(tmp, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  const configPath = path.join(tmp, 'designlint.config.js');
  fs.writeFileSync(
    configPath,
    "export default { tokens: { colors: { primary: '#000' } } };",
  );
  const loaded = await loadConfig(tmp);
  assert.equal(loaded.tokens?.colors?.primary, '#000');
});

test("rule configured as 'off' is ignored", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const configPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: { colors: { primary: '#000' } },
      rules: { 'design-token/colors': 'off' },
    }),
  );
  const config = await loadConfig(tmp);
  const linter = new Linter(config);
  const res = await linter.lintText('const c = "#fff";', 'file.ts');
  assert.equal(res.messages.length, 0);
});
