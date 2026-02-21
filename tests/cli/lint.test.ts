import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsxLoader = require.resolve('tsx/esm');
const __dirname = path.dirname(new URL(import.meta.url).pathname);

void test('lint command reports token color violations', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { default: './base.tokens.json' },
      rules: { 'design-token/colors': 'error' },
    }),
  );
  fs.writeFileSync(path.join(dir, 'input.css'), 'a { color: #fff; }');

  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'input.css',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.equal(res.status, 1);
  assert.match(res.stdout, /input.css/);
});

void test('lint command exits successfully when no files match by default', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');

  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--import', tsxLoader, cli, 'missing/**/*.css'],
    { cwd: dir, encoding: 'utf8' },
  );

  assert.equal(res.status, 0);
  assert.match(res.stderr, /No files matched the provided patterns\./);
});

void test('lint command exits with failure when --fail-on-empty is enabled', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');

  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--import', tsxLoader, cli, 'missing/**/*.css', '--fail-on-empty'],
    { cwd: dir, encoding: 'utf8' },
  );

  assert.equal(res.status, 1);
  assert.match(res.stderr, /No files matched the provided patterns\./);
});

void test('lint command reports unsupported explicit file types', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');
  fs.writeFileSync(path.join(dir, 'input.html'), '<div />');

  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--import', tsxLoader, cli, 'input.html'],
    { cwd: dir, encoding: 'utf8' },
  );

  assert.equal(res.status, 1);
  assert.match(res.stdout, /parse-error/);
  assert.match(res.stdout, /Unsupported file type/);
});

void test('lint command uses formatter from config when --format is omitted', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      format: 'json',
      tokens: { default: './base.tokens.json' },
      rules: { 'design-token/colors': 'error' },
    }),
  );
  fs.writeFileSync(path.join(dir, 'input.css'), 'a { color: #fff; }');

  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'input.css',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );

  assert.equal(res.status, 1);
  assert.match(res.stdout, /^\s*\[/);
  assert.match(res.stdout, /"sourceId":\s*".*input\.css"/);
});

void test('lint command CLI --format overrides formatter from config', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'base.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      format: 'json',
      tokens: { default: './base.tokens.json' },
      rules: { 'design-token/colors': 'error' },
    }),
  );
  fs.writeFileSync(path.join(dir, 'input.css'), 'a { color: #fff; }');

  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'input.css',
      '--config',
      'designlint.config.json',
      '--format',
      'stylish',
    ],
    { cwd: dir, encoding: 'utf8' },
  );

  assert.equal(res.status, 1);
  assert.doesNotMatch(res.stdout, /^\s*\[/);
  assert.match(res.stdout, /input.css/);
});
