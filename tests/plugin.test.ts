import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { Linter } from '../src/core/linter.ts';
import { loadConfig } from '../src/config/loader.ts';

test('external plugin rules execute', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'test-plugin.ts');
  const linter = new Linter({
    plugins: [pluginPath],
    rules: { 'plugin/test': 'error' },
  });
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'plugin/test');
});

test('plugins resolve relative to config file', async () => {
  const dir = path.join(__dirname, 'fixtures', 'plugin-relative');
  const config = await loadConfig(dir);
  const linter = new Linter(config);
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'plugin/test');
});

test('loads ESM plugin modules', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'test-plugin-esm.mjs');
  const linter = new Linter({
    plugins: [pluginPath],
    rules: { 'plugin/esm': 'error' },
  });
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'plugin/esm');
});

test('throws for invalid plugin modules', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'invalid-plugin.ts');
  const linter = new Linter({ plugins: [pluginPath] });
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    /Invalid plugin/,
  );
});

test('throws for invalid plugin rules', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'invalid-rule-plugin.ts');
  const linter = new Linter({ plugins: [pluginPath] });
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    /Invalid rule/,
  );
});

test('throws when plugin module missing', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'missing-plugin.js');
  const linter = new Linter({ plugins: [pluginPath] });
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    /Failed to load plugin/,
  );
});

test('throws when plugin rule conflicts with existing rule', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'conflict-plugin.ts');
  const linter = new Linter({ plugins: [pluginPath] });
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    /conflicts with an existing rule/,
  );
});

test('throws when two plugins define the same rule name', async () => {
  const pluginA = path.join(__dirname, 'fixtures', 'test-plugin.ts');
  const pluginB = path.join(__dirname, 'fixtures', 'duplicate-rule-plugin.ts');
  const linter = new Linter({ plugins: [pluginA, pluginB] });
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes(pluginA));
      assert.ok(err.message.includes(pluginB));
      return true;
    },
  );
});
