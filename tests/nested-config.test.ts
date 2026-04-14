/**
 * Tests for nested config loading and merging.
 *
 * Uses loadConfig and createLinter directly — no subprocess spawning.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.js';
import { loadConfig } from '../src/config/loader.js';
import { createLinter } from '../src/index.js';
import { createNodeEnvironment } from '../src/adapters/node/environment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

void test('loads nearest config and reports violations in nested project', async () => {
  const appDir = path.join(
    __dirname,
    'fixtures',
    'nested-config',
    'packages',
    'app',
  );
  const configPath = path.join(appDir, 'designlint.config.json');

  const config = await loadConfig(appDir, configPath);
  const env = createNodeEnvironment(config, { configPath });
  const linter = createLinter(config, env);
  const { results } = await linter.lintTargets([appDir]);

  assert.ok(results.length > 0, 'Expected lint results');
  const files = results.map((r) => path.relative(appDir, r.sourceId)).sort();
  assert.deepEqual(files, ['src/App.module.css', 'src/App.tsx']);
  for (const r of results) {
    for (const m of r.messages) {
      assert.equal(m.ruleId, 'design-token/colors');
    }
  }
});

void test('loadConfig merges parent and child configs root-to-leaf', async () => {
  const tmp = makeTmpDir();
  const workspaceConfigPath = path.join(tmp, 'designlint.config.json');
  fs.writeFileSync(
    workspaceConfigPath,
    JSON.stringify({
      rules: { 'design-token/colors': 'error' },
      ignoreFiles: ['**/*.stories.tsx'],
      plugins: ['@acme/root-plugin'],
      patterns: ['src/**/*.{ts,tsx}'],
      concurrency: 2,
    }),
  );

  const appDir = path.join(tmp, 'packages', 'app');
  fs.mkdirSync(appDir, { recursive: true });
  const appConfigPath = path.join(appDir, 'designlint.config.json');
  fs.writeFileSync(
    appConfigPath,
    JSON.stringify({
      rules: { 'design-token/colors': 'warn' },
      ignoreFiles: ['src/generated/**'],
      plugins: ['@acme/app-plugin'],
      patterns: ['app/**/*.{ts,tsx}'],
      concurrency: 1,
    }),
  );

  const config = await loadConfig(appDir);

  assert.deepEqual(config.rules, { 'design-token/colors': 'warn' });
  assert.deepEqual(config.ignoreFiles, [
    '**/*.stories.tsx',
    'src/generated/**',
  ]);
  assert.deepEqual(config.plugins, ['@acme/root-plugin', '@acme/app-plugin']);
  assert.deepEqual(config.patterns, ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}']);
  assert.equal(config.concurrency, 1);
  assert.equal(config.configPath, appConfigPath);
  assert.deepEqual(config.configSources, [workspaceConfigPath, appConfigPath]);
});
