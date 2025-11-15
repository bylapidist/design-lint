import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { NodePluginLoader } from '../../../src/adapters/node/plugin-loader.ts';
import { PluginError } from '../../../src/core/errors.ts';

function makeTempDir(t: TestContext): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-loader-'));
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

void test('NodePluginLoader loads CommonJS plugins exported directly', async (t) => {
  const dir = makeTempDir(t);
  const pluginPath = path.join(dir, 'cjs-plugin.cjs');
  fs.writeFileSync(
    pluginPath,
    "module.exports = { rules: [{ id: 'rule-id' }], name: 'direct', version: '1.2.3', init() { return 'ok'; } };\n",
    'utf8',
  );

  const loader = new NodePluginLoader();
  const loaded = await loader.load(pluginPath);

  const real = fs.realpathSync.native(pluginPath);
  assert.equal(loaded.path, real);
  assert.equal(loaded.plugin.name, 'direct');
  assert.equal(loaded.plugin.version, '1.2.3');
  assert.equal(typeof loaded.plugin.init, 'function');
  assert.deepEqual(loaded.plugin.rules, [{ id: 'rule-id' }]);
});

void test('NodePluginLoader resolves plugin exports nested under plugin property', async (t) => {
  const dir = makeTempDir(t);
  const pluginPath = path.join(dir, 'nested.cjs');
  fs.writeFileSync(
    pluginPath,
    "module.exports = { plugin: { rules: [], name: 'nested' } };\n",
    'utf8',
  );

  const loader = new NodePluginLoader();
  const loaded = await loader.load(pluginPath);
  assert.equal(loaded.plugin.name, 'nested');
  assert.deepEqual(loaded.plugin.rules, []);
});

void test('NodePluginLoader dynamically imports ESM plugins', async (t) => {
  const dir = makeTempDir(t);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    '{"type":"module"}\n',
    'utf8',
  );
  const pluginPath = path.join(dir, 'esm-plugin.js');
  fs.writeFileSync(
    pluginPath,
    "export default { rules: [{ id: 'esm-rule' }] };\n",
    'utf8',
  );

  const loader = new NodePluginLoader();
  const loaded = await loader.load(pluginPath);
  assert.deepEqual(loaded.plugin.rules, [{ id: 'esm-rule' }]);
});

void test('NodePluginLoader wraps loader errors in PluginError', async (t) => {
  const dir = makeTempDir(t);
  const pluginPath = path.join(dir, 'broken.cjs');
  fs.writeFileSync(pluginPath, 'module.exports = {', 'utf8');

  const loader = new NodePluginLoader();
  await assert.rejects(
    async () => loader.load(pluginPath),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.match(err.message, /Failed to load plugin/);
      return true;
    },
  );
});

void test('NodePluginLoader throws PluginError when plugin export is invalid', async (t) => {
  const dir = makeTempDir(t);
  const pluginPath = path.join(dir, 'invalid.cjs');
  fs.writeFileSync(
    pluginPath,
    'module.exports = { notRules: true };\n',
    'utf8',
  );

  const loader = new NodePluginLoader();
  await assert.rejects(
    async () => loader.load(pluginPath),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.match(err.message, /Invalid plugin module/);
      return true;
    },
  );
});

void test('NodePluginLoader reports missing plugin files', async () => {
  const loader = new NodePluginLoader();
  const missing = path.join(
    os.tmpdir(),
    `missing-plugin-${String(Date.now())}.cjs`,
  );

  await assert.rejects(
    async () => loader.load(missing),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.match(err.message, /Plugin not found/);
      return true;
    },
  );
});
