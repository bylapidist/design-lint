import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { createLinter as initLinter } from '../src/index.ts';
import { FileSource } from '../src/adapters/node/file-source.ts';
import { loadConfig } from '../src/config/loader.ts';
import { NodePluginLoader } from '../src/adapters/node/plugin-loader.ts';
import type { PluginLoader } from '../src/core/plugin-loader.ts';
import type { PluginModule, RuleModule } from '../src/core/types.ts';
import type { Environment } from '../src/core/environment.ts';
import { PluginError } from '../src/core/errors.ts';

void test('external plugin rules execute', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'test-plugin.ts');
  const linter = initLinter(
    {
      plugins: [pluginPath],
      rules: { 'plugin/test': 'error' },
    },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'plugin/test');
});

void test('plugins resolve relative to config file', async () => {
  const dir = path.join(__dirname, 'fixtures', 'plugin-relative');
  const config = await loadConfig(dir);
  const linter = initLinter(config, {
    documentSource: new FileSource(),
    pluginLoader: new NodePluginLoader(),
  });
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'plugin/test');
});

void test('loads ESM plugin modules', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'test-plugin-esm.mjs');
  const linter = initLinter(
    {
      plugins: [pluginPath],
      rules: { 'plugin/esm': 'error' },
    },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'plugin/esm');
});

void test('throws for invalid plugin modules', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'invalid-plugin.ts');
  const linter = initLinter(
    { plugins: [pluginPath] },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.equal(err.context, 'Plugin');
      assert.equal(err.remediation, 'Ensure the plugin exports a rules array.');
      return err.message.includes('Invalid plugin module');
    },
  );
});

void test('throws for invalid plugin rules', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'invalid-rule-plugin.ts');
  const linter = initLinter(
    { plugins: [pluginPath] },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.ok(err.context.includes('invalid-rule-plugin'));
      assert.equal(
        err.remediation,
        'Ensure each rule has a non-empty name, meta.description, and a create function.',
      );
      return err.message.includes('Invalid rule');
    },
  );
});

void test('throws when plugin module missing', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'missing-plugin.js');
  const linter = initLinter(
    { plugins: [pluginPath] },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.ok(err.context.includes('missing-plugin.js'));
      assert.equal(
        err.remediation,
        'Ensure the plugin is installed and resolvable.',
      );
      return err.message.includes('Failed to load plugin');
    },
  );
});

void test('throws when plugin rule conflicts with existing rule', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'conflict-plugin.ts');
  const linter = initLinter(
    { plugins: [pluginPath] },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.ok(err.context.includes('conflict-plugin.ts'));
      assert.equal(
        err.remediation,
        'Use a unique rule name to avoid collisions.',
      );
      return err.message.includes('conflicts with rule');
    },
  );
});

void test('throws when two plugins define the same rule name', async () => {
  const pluginA = path.join(__dirname, 'fixtures', 'test-plugin.ts');
  const pluginB = path.join(__dirname, 'fixtures', 'duplicate-rule-plugin.ts');
  const linter = initLinter(
    { plugins: [pluginA, pluginB] },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  await assert.rejects(
    () => linter.lintText('const a = 1;', 'file.ts'),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.ok(err.context.includes('duplicate-rule-plugin.ts'));
      assert.equal(
        err.remediation,
        'Use a unique rule name to avoid collisions.',
      );
      assert.ok(err.message.includes(pluginA));
      assert.ok(err.message.includes(pluginB));
      return true;
    },
  );
});

void test('getPluginPaths returns resolved plugin paths', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'test-plugin.ts');
  const linter = initLinter(
    { plugins: [pluginPath] },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  await linter.lintText('const a = 1;', 'file.ts');
  const paths = await linter.getPluginPaths();
  assert.deepEqual(paths, [pluginPath]);
});

void test('supports custom plugin loaders', async () => {
  class MockLoader implements PluginLoader {
    load(
      _p: string,
      _c?: string,
    ): Promise<{ path: string; plugin: PluginModule }> {
      void _p;
      void _c;
      const rule: RuleModule = {
        name: 'mock/rule',
        meta: { description: 'mock rule' },
        create: (ctx) => {
          ctx.getFlattenedTokens('color');
          return {};
        },
      };
      return Promise.resolve({ path: 'mock', plugin: { rules: [rule] } });
    }
  }
  const linter = initLinter(
    { plugins: ['mock'], rules: { 'mock/rule': 'error' } },
    { documentSource: new FileSource(), pluginLoader: new MockLoader() },
  );
  const res = await linter.lintText('const a = 1;', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'mock/rule');
});

void test('calls plugin init with environment', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'init-plugin.ts');
  const env = {
    documentSource: new FileSource(),
    pluginLoader: new NodePluginLoader(),
  };
  const linter = initLinter({ plugins: [pluginPath] }, env);
  await linter.lintText('const a = 1;', 'file.ts');
  const mod = (await import(pluginPath)) as { inits: Environment[] };
  assert.equal(mod.inits.length, 1);
  assert.strictEqual(mod.inits[0], env);
});

void test('exposes plugin metadata', async () => {
  const pluginPath = path.join(__dirname, 'fixtures', 'init-plugin.ts');
  const linter = initLinter(
    { plugins: [pluginPath] },
    {
      documentSource: new FileSource(),
      pluginLoader: new NodePluginLoader(),
    },
  );
  await linter.lintText('const a = 1;', 'file.ts');
  const meta = await linter.getPluginMetadata();
  assert.deepEqual(meta, [
    { path: pluginPath, name: 'init-plugin', version: '1.0.0' },
  ]);
});

void test('plugin init can transform tokens before load', async () => {
  const pluginPath = path.join(
    __dirname,
    'fixtures',
    'token-transform-plugin.ts',
  );
  const linter = initLinter(
    {
      plugins: [pluginPath],
      tokens: { color: { red: { $type: 'color', $value: '#f00' } } },
    },
    { documentSource: new FileSource(), pluginLoader: new NodePluginLoader() },
  );
  await linter.lintText('const a = 1;', 'file.ts');
  const completions = linter.getTokenCompletions();
  assert.ok(completions.default.includes('color.blue'));
});
