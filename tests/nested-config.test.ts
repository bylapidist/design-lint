import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.js';
import { loadConfig } from '../src/config/loader.js';

const tsxLoader = createRequire(import.meta.url).resolve('tsx/esm');
const __dirname = fileURLToPath(new URL('.', import.meta.url));

void test('CLI loads nearest config in nested project', () => {
  const appDir = path.join(
    __dirname,
    'fixtures',
    'nested-config',
    'packages',
    'app',
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--import', tsxLoader, cli, '.', '--format', 'json'],
    { cwd: appDir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  interface Result {
    sourceId: string;
    messages: { ruleId: string }[];
  }
  const parsed = JSON.parse(res.stdout) as unknown;
  assert(Array.isArray(parsed));
  const results = parsed as Result[];
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
