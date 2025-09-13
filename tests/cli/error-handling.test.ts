import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsxLoader = require.resolve('tsx/esm');
const __dirname = path.dirname(new URL(import.meta.url).pathname);

void test('reports config errors and sets exit code', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'designlint-'));
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: 5, rules: {} }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--import', tsxLoader, cli, '--config', 'designlint.config.json'],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Invalid config/);
});

void test('fails on unresolved aliases', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'designlint-'));
  fs.writeFileSync(
    path.join(dir, 'tokens.tokens.json'),
    JSON.stringify({
      color: {
        red: { $type: 'color', $value: '#ff0000' },
        bad1: { $type: 'color', $value: '{color.missing}' },
        bad2: { $type: 'color', $value: '{color.missing}' },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { default: './tokens.tokens.json' },
      rules: {},
      output: [],
    }),
  );
  const cli = path.join(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--import',
      tsxLoader,
      cli,
      'tokens',
      '--config',
      'designlint.config.json',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /references unknown token/i);
});
