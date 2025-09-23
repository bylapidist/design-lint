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
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        default: {
          $version: '1.0.0',
          color: {
            red: {
              $type: 'color',
              $value: { colorSpace: 'srgb', components: [1, 0, 0] },
            },
          },
        },
      },
      rules: {},
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
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Configuration is valid/);
});

void test('validate command fails on invalid tokens', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        default: {
          $version: '1.0.0',
          color: {
            bad: {
              $type: 'color',
              $value: { colorSpace: 'srgb' },
            },
          },
        },
      },
      rules: {},
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
  assert.match(res.stderr, /DTIF/i);
});

void test('validate command fails on unresolved aliases', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {
        default: {
          $version: '1.0.0',
          color: {
            red: { $type: 'color', $ref: '#/color/green' },
            green: { $type: 'color', $ref: '#/color/red' },
          },
        },
      },
      rules: {},
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
  assert.match(res.stderr, /DTIF/i);
});
