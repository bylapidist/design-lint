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

void test('validate command reports valid configuration', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'tokens.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        red: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: { default: './tokens.tokens.json' }, rules: {} }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'validate',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Configuration is valid/);
});

void test('validate command fails on invalid tokens', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'tokens.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        bad: {
          $type: 'color',
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: { default: './tokens.tokens.json' }, rules: {} }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'validate',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Failed to parse DTIF document/);
});

void test('validate command fails on unresolved aliases', () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'tokens.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        red: { $type: 'color', $ref: '#/color/green' },
        green: { $type: 'color', $ref: '#/color/red' },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: { default: './tokens.tokens.json' }, rules: {} }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'validate',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Failed to parse DTIF document/);
});

void test('validate command fails on unknown rules', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {},
      rules: {
        'design-token/not-a-rule': 'error',
      },
    }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'validate',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Unknown rule\(s\): design-token\/not-a-rule/);
});

void test('validate command fails on invalid rule options', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {},
      rules: {
        'design-system/no-unused-tokens': ['error', { ignore: 1 }],
      },
    }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'validate',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.match(
    res.stderr,
    /Invalid options for rule design-system\/no-unused-tokens/,
  );
});

void test('validate command fails on unknown formatter in config', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {},
      rules: {},
      format: 'not-a-real-formatter',
    }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'validate',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Unknown formatter: not-a-real-formatter/);
});
