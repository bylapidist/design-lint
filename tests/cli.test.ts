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

test('CLI loads external plugin rules', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = 1;');
  const plugin = path.join(__dirname, 'fixtures', 'test-plugin.ts');
  const config = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    config,
    JSON.stringify({ plugins: [plugin], rules: { 'plugin/test': 'error' } }),
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      'ts-node/register',
      cli,
      file,
      '--config',
      config,
      '--format',
      'json',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stdout.includes('plugin/test'));
});

test('CLI reports plugin load errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, '');
  const badPlugin = path.join(dir, 'missing-plugin.js');
  const config = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(config, JSON.stringify({ plugins: [badPlugin] }));
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--require', 'ts-node/register', cli, file, '--config', config],
    { encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Failed to load plugin'));
});

test('CLI ignores common directories by default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'file.ts'), 'const a = "old";');
  fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'node_modules', 'pkg', 'index.ts'),
    'const a = "old";',
  );
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist', 'file.ts'), 'const a = "old";');
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
    [
      '--require',
      'ts-node/register',
      cli,
      dir,
      '--config',
      config,
      '--format',
      'json',
    ],
    { encoding: 'utf8' },
  );
  interface Result {
    filePath: string;
  }
  const parsed: Result[] = JSON.parse(res.stdout);
  const files = parsed.map((r) => path.relative(dir, r.filePath)).sort();
  assert.deepEqual(files, ['src/file.ts']);
});

test('.designlintignore can unignore paths via CLI', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'file.ts'), 'const a = "old";');
  fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'node_modules', 'pkg', 'index.ts'),
    'const a = "old";',
  );
  fs.writeFileSync(path.join(dir, '.designlintignore'), '!node_modules/**');
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
    [
      '--require',
      'ts-node/register',
      cli,
      dir,
      '--config',
      config,
      '--format',
      'json',
    ],
    {
      encoding: 'utf8',
      cwd: dir,
      env: {
        ...process.env,
        NODE_PATH: path.join(__dirname, '..', 'node_modules'),
      },
    },
  );
  interface Result {
    filePath: string;
  }
  const parsed: Result[] = JSON.parse(res.stdout);
  const files = parsed.map((r) => path.relative(dir, r.filePath)).sort();
  assert.deepEqual(files, ['node_modules/pkg/index.ts', 'src/file.ts']);
});

test('CLI skips directories listed in .designlintignore', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'file.ts'), 'const a = "old";');
  fs.mkdirSync(path.join(dir, 'ignored', 'pkg'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'ignored', 'pkg', 'index.ts'),
    'const a = "old";',
  );
  fs.writeFileSync(path.join(dir, '.designlintignore'), 'ignored/**');
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
    [
      '--require',
      'ts-node/register',
      cli,
      dir,
      '--config',
      config,
      '--format',
      'json',
    ],
    { encoding: 'utf8' },
  );
  interface Result {
    filePath: string;
  }
  const parsed: Result[] = JSON.parse(res.stdout);
  const files = parsed.map((r) => path.relative(dir, r.filePath)).sort();
  assert.deepEqual(files, ['src/file.ts']);
});
