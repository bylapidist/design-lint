import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test('CLI exits non-zero on lint errors', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const result = spawnSync(
    process.execPath,
    [
      '--require',
      'ts-node/register',
      cli,
      path.join(fixture, 'bad.ts'),
      '--config',
      path.join(fixture, 'designlint.config.json'),
      '--format',
      'json',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.ok(result.stdout.includes('design-token/colors'));
});

test('CLI --fix applies fixes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = "old";');
  const config = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    config,
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    }),
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--require', 'ts-node/register', cli, file, '--config', config, '--fix'],
    { encoding: 'utf8' },
  );
  assert.equal(res.status, 0);
  const out = fs.readFileSync(file, 'utf8');
  assert.equal(out, "const a = 'new';");
});

test('CLI surfaces config load errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const badConfig = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(badConfig, '{ invalid');
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, '');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--require', 'ts-node/register', cli, file, '--config', badConfig],
    { encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.trim().length > 0);
});

test('CLI surfaces output write errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = 1;');
  const out = path.join(dir, 'no', 'report.txt');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--require', 'ts-node/register', cli, file, '--output', out],
    { encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('ENOENT'));
});

test('CLI reports unknown formatter', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      'ts-node/register',
      cli,
      path.join(fixture, 'bad.ts'),
      '--config',
      path.join(fixture, 'designlint.config.json'),
      '--format',
      'unknown',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Unknown formatter'));
});
