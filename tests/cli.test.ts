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
