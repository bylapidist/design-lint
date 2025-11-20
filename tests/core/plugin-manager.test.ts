import test from 'node:test';
import assert from 'node:assert/strict';

import { PluginManager } from '../../src/core/plugin-manager.js';
import { PluginError } from '../../src/core/errors.js';
import type { Config } from '../../src/core/linter.js';
import type { RuleModule } from '../../src/core/types.js';
import type { Environment } from '../../src/core/environment.js';
import type {
  LoadedPlugin,
  PluginLoader,
} from '../../src/core/plugin-loader.js';

interface RuleEntry {
  rule: RuleModule;
  source: string;
}

interface LoaderFactoryResult {
  loader: PluginLoader;
  getLoadCount: () => number;
}

const baseConfig: Config = {
  plugins: ['test-plugin'],
  configPath: '/tmp/design-lint.config.ts',
};

const noopEnvironment: Environment = {
  documentSource: {
    scan() {
      return Promise.resolve({ documents: [], ignoreFiles: [] });
    },
  },
};

function makeRule(name: string): RuleModule {
  return {
    name,
    meta: { description: `${name} description` },
    create() {
      return {};
    },
  };
}

function makeLoader(plugin: unknown): LoaderFactoryResult {
  let loadCount = 0;
  const loader: PluginLoader = {
    load(id, configPath) {
      loadCount++;
      assert.equal(id, 'test-plugin');
      assert.equal(configPath, baseConfig.configPath);
      return Promise.resolve({
        path: '/plugins/test-plugin.cjs',
        plugin,
      } as LoadedPlugin);
    },
  };
  return { loader, getLoadCount: () => loadCount };
}

void test('PluginManager loads plugins, registers rules, and caches metadata', async () => {
  const ruleMap = new Map<string, RuleEntry>();
  const initCalls: Environment[] = [];
  const plugin = {
    name: 'Test Plugin',
    version: '1.2.3',
    rules: [makeRule('first'), makeRule('second')],
    init(env: Environment) {
      initCalls.push(env);
    },
  };
  const { loader, getLoadCount } = makeLoader(plugin);
  const manager = new PluginManager(baseConfig, ruleMap, loader);

  const metadata = await manager.getPlugins(noopEnvironment);
  assert.deepEqual(metadata, [
    { path: '/plugins/test-plugin.cjs', name: 'Test Plugin', version: '1.2.3' },
  ]);
  assert.equal(ruleMap.size, 2);
  assert.equal(ruleMap.get('first')?.source, '/plugins/test-plugin.cjs');
  assert.equal(ruleMap.get('first')?.rule, plugin.rules[0]);
  assert.equal(initCalls.length, 1);
  assert.strictEqual(initCalls[0], noopEnvironment);

  const cached = await manager.getPlugins(noopEnvironment);
  assert.strictEqual(cached, metadata);
  assert.equal(getLoadCount(), 1);
});

void test('PluginManager throws when plugin does not expose rules array', async () => {
  const ruleMap = new Map<string, RuleEntry>();
  const { loader } = makeLoader({ name: 'Invalid Plugin', rules: null });
  const manager = new PluginManager(baseConfig, ruleMap, loader);

  await assert.rejects(
    () => manager.getPlugins(noopEnvironment),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.match(err.message, /Invalid plugin/);
      return true;
    },
  );
});

void test('PluginManager rejects invalid rule modules', async () => {
  const ruleMap = new Map<string, RuleEntry>();
  const { loader } = makeLoader({ rules: [{}] });
  const manager = new PluginManager(baseConfig, ruleMap, loader);

  await assert.rejects(
    () => manager.getPlugins(noopEnvironment),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.match(err.message, /Invalid rule/);
      return true;
    },
  );
});

void test('PluginManager reports rule name conflicts across plugins', async () => {
  const rule = makeRule('conflict');
  const ruleMap = new Map<string, RuleEntry>([
    [rule.name, { rule, source: '/existing/plugin.cjs' }],
  ]);
  const { loader } = makeLoader({ rules: [makeRule('conflict')] });
  const manager = new PluginManager(baseConfig, ruleMap, loader);

  await assert.rejects(
    () => manager.getPlugins(noopEnvironment),
    (err) => {
      assert.ok(err instanceof PluginError);
      assert.match(err.message, /conflicts with rule/);
      return true;
    },
  );
});
