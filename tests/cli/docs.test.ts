/**
 * Tests for the `design-lint docs` and `design-lint export-design-system-md` CLI commands.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';

const require = createRequire(import.meta.url);
const tsxLoader = require.resolve('tsx/esm');
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');

function makeTokenDir(): string {
  const dir = makeTmpDir();
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0.2, 0.4, 0.9] },
      },
    },
    spacing: {
      4: {
        $type: 'dimension',
        $value: '16px',
      },
    },
  };
  fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify(tokens));
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: './tokens.json', rules: {} }),
  );
  return dir;
}

function runCli(dir: string, args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ['--import', tsxLoader, cli, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
}

// ---------------------------------------------------------------------------
// design-lint docs
// ---------------------------------------------------------------------------

void test('docs command creates an index.md in the output directory', () => {
  const dir = makeTokenDir();
  const outDir = path.join(dir, 'out-docs');

  const res = runCli(dir, [
    'docs',
    '--out',
    outDir,
    '--config',
    'designlint.config.json',
  ]);

  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);
  const indexPath = path.join(outDir, 'index.md');
  assert.ok(fs.existsSync(indexPath), 'index.md should exist');
  const content = fs.readFileSync(indexPath, 'utf8');
  assert.ok(content.includes('# Design System Documentation'));
});

void test('docs command creates a rules directory with at least one rule page', () => {
  const dir = makeTokenDir();
  const outDir = path.join(dir, 'out-docs-rules');

  const res = runCli(dir, [
    'docs',
    '--out',
    outDir,
    '--config',
    'designlint.config.json',
  ]);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);

  const rulesDir = path.join(outDir, 'rules');
  assert.ok(fs.existsSync(rulesDir), 'rules/ directory should exist');
  const ruleFiles = fs.readdirSync(rulesDir);
  assert.ok(ruleFiles.length > 0, 'rules/ should contain at least one file');
});

void test('docs command creates a .vitepress/config.mts for vitepress format', () => {
  const dir = makeTokenDir();
  const outDir = path.join(dir, 'out-vitepress');

  const res = runCli(dir, [
    'docs',
    '--out',
    outDir,
    '--format',
    'vitepress',
    '--config',
    'designlint.config.json',
  ]);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);

  const configPath = path.join(outDir, '.vitepress', 'config.mts');
  assert.ok(fs.existsSync(configPath), '.vitepress/config.mts should exist');
  const config = fs.readFileSync(configPath, 'utf8');
  assert.ok(config.includes('defineConfig'));
  assert.ok(config.includes('sidebar'));
});

void test('docs command creates token pages for configured token types', () => {
  const dir = makeTokenDir();
  const outDir = path.join(dir, 'out-tokens');

  const res = runCli(dir, [
    'docs',
    '--out',
    outDir,
    '--config',
    'designlint.config.json',
  ]);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);

  const tokensDir = path.join(outDir, 'tokens');
  assert.ok(fs.existsSync(tokensDir), 'tokens/ directory should exist');

  // color type should produce a page
  const colorPage = path.join(tokensDir, 'color.md');
  assert.ok(fs.existsSync(colorPage), 'tokens/color.md should exist');
  const colorContent = fs.readFileSync(colorPage, 'utf8');
  assert.ok(colorContent.includes('Color Tokens'));
  assert.ok(colorContent.includes('#/color/primary'));
});

void test('docs markdown format omits .vitepress config', () => {
  const dir = makeTokenDir();
  const outDir = path.join(dir, 'out-markdown');

  const res = runCli(dir, [
    'docs',
    '--out',
    outDir,
    '--format',
    'markdown',
    '--config',
    'designlint.config.json',
  ]);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);

  const configPath = path.join(outDir, '.vitepress', 'config.mts');
  assert.ok(
    !fs.existsSync(configPath),
    '.vitepress/config.mts should NOT exist for markdown format',
  );
});

// ---------------------------------------------------------------------------
// design-lint export-design-system-md
// ---------------------------------------------------------------------------

void test('export-design-system-md generates a DESIGN_SYSTEM.md file', () => {
  const dir = makeTokenDir();

  const res = runCli(dir, [
    'export-design-system-md',
    '--out',
    'DESIGN_SYSTEM.md',
    '--config',
    'designlint.config.json',
  ]);

  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);
  const outPath = path.join(dir, 'DESIGN_SYSTEM.md');
  assert.ok(fs.existsSync(outPath));
  const content = fs.readFileSync(outPath, 'utf8');
  assert.ok(content.includes('# DESIGN_SYSTEM.md'));
  assert.ok(content.includes('<!-- dscp:meta -->'));
  assert.ok(content.includes('<!-- dscp:rules -->'));
  assert.ok(content.includes('<!-- dscp:violations -->'));
});

void test('export-design-system-md includes token sections for configured types', () => {
  const dir = makeTokenDir();

  const res = runCli(dir, [
    'export-design-system-md',
    '--config',
    'designlint.config.json',
  ]);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);

  const content = fs.readFileSync(path.join(dir, 'DESIGN_SYSTEM.md'), 'utf8');
  assert.ok(content.includes('<!-- dscp:tokens:color -->'));
  assert.ok(content.includes('#/color/primary'));
});

void test('export-design-system-md includes rule rationale in rules section', () => {
  const dir = makeTokenDir();

  const res = runCli(dir, [
    'export-design-system-md',
    '--config',
    'designlint.config.json',
  ]);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);

  const content = fs.readFileSync(path.join(dir, 'DESIGN_SYSTEM.md'), 'utf8');
  // All rules should appear in the rules section
  assert.ok(content.includes('design-token/colors'));
  assert.ok(content.includes('design-system/no-inline-styles'));
});

// ---------------------------------------------------------------------------
// design-lint migrate
// ---------------------------------------------------------------------------

void test('migrate command detects no changes for a v8-compatible JSON config', () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  const config = { rules: { 'design-token/colors': 'error' } };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const res = runCli(dir, ['migrate', '--config', 'designlint.config.json']);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);
  assert.ok(res.stdout.includes('already compatible'));
});

void test('migrate command upgrades numeric severity codes in JSON config', () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  const config = {
    rules: { 'design-token/colors': 2, 'design-token/spacing': 1 },
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const res = runCli(dir, [
    'migrate',
    '--config',
    'designlint.config.json',
    '--dry-run',
  ]);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);
  assert.ok(res.stdout.includes('"error"') || res.stdout.includes('"warn"'));
});

void test('migrate command writes migrated config to --out file', () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'config.json');
  const config = { rules: { 'design-token/colors': 2 } };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const res = runCli(dir, [
    'migrate',
    '--config',
    'config.json',
    '--out',
    'migrated.json',
  ]);
  assert.equal(res.status, 0, `stderr: ${String(res.stderr)}`);

  const migrated = JSON.parse(
    fs.readFileSync(path.join(dir, 'migrated.json'), 'utf8'),
  ) as { rules: Record<string, unknown> };
  assert.equal(migrated.rules['design-token/colors'], 'error');
});
