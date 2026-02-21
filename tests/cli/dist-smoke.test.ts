import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const cli = path.join(__dirname, '..', '..', 'dist', 'cli', 'index.js');

void test('dist CLI reports version', () => {
  const result = spawnSync(process.execPath, [cli, '--version'], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\d+\.\d+\.\d+/);
});

void test('dist CLI preserves fail-on-empty exit semantics', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');

  const noFail = spawnSync(
    process.execPath,
    [cli, 'missing/**/*.css', '--config', 'designlint.config.json'],
    {
      cwd: dir,
      encoding: 'utf8',
    },
  );
  assert.equal(noFail.status, 0);
  assert.match(noFail.stderr, /No files matched the provided patterns/);

  const withFail = spawnSync(
    process.execPath,
    [
      cli,
      'missing/**/*.css',
      '--config',
      'designlint.config.json',
      '--fail-on-empty',
    ],
    {
      cwd: dir,
      encoding: 'utf8',
    },
  );
  assert.equal(withFail.status, 1);
  assert.match(withFail.stderr, /No files matched the provided patterns/);
});
