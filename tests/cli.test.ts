import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const tsNodeRegister = path.join(
  __dirname,
  '..',
  'node_modules',
  'ts-node/register',
);

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
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
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
      tsNodeRegister,
      cli,
      'file.ts',
      '--config',
      'designlint.config.json',
      '--fix',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.equal(res.status, 0);
  const out = fs.readFileSync(path.join(dir, 'file.ts'), 'utf8');
  assert.equal(out, "const a = 'new';");
});

test('CLI surfaces config load errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{ invalid');
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      'file.ts',
      '--config',
      'designlint.config.json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.trim().length > 0);
});

test('CLI surfaces output write errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      'file.ts',
      '--output',
      path.join('no', 'report.txt'),
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('ENOENT'));
});

test('CLI writes report to file with --output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
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
      tsNodeRegister,
      cli,
      'file.ts',
      '--config',
      'designlint.config.json',
      '--format',
      'json',
      '--output',
      'report.json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.equal(res.stdout.trim(), '');
  const report = fs.readFileSync(path.join(dir, 'report.json'), 'utf8');
  assert.ok(report.includes('design-system/deprecation'));
});

test('CLI --quiet suppresses stdout output', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      path.join(fixture, 'bad.ts'),
      '--config',
      path.join(fixture, 'designlint.config.json'),
      '--quiet',
      '--format',
      'json',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  assert.equal(res.stdout.trim(), '');
});

test('CLI reports unknown formatter', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
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
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  const plugin = path.join(__dirname, 'fixtures', 'test-plugin.ts');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ plugins: [plugin], rules: { 'plugin/test': 'error' } }),
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      'file.ts',
      '--config',
      'designlint.config.json',
      '--format',
      'json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stdout.includes('plugin/test'));
});

test('CLI reports plugin load errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  const badPlugin = path.join(dir, 'missing-plugin.js');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ plugins: [badPlugin] }),
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      'file.ts',
      '--config',
      'designlint.config.json',
    ],
    { encoding: 'utf8', cwd: dir },
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
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    }),
  );
  const parent = path.dirname(dir);
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      path.basename(dir),
      '--config',
      path.join(path.basename(dir), 'designlint.config.json'),
      '--format',
      'json',
    ],
    { encoding: 'utf8', cwd: parent },
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
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
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
      tsNodeRegister,
      cli,
      'src',
      'node_modules',
      '--config',
      'designlint.config.json',
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
  fs.writeFileSync(path.join(dir, '.designlintignore'), 'ignored');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
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
      tsNodeRegister,
      cli,
      'src',
      'ignored',
      '--config',
      'designlint.config.json',
      '--format',
      'json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  interface Result {
    filePath: string;
  }
  const parsed: Result[] = JSON.parse(res.stdout);
  const files = parsed.map((r) => path.relative(dir, r.filePath)).sort();
  assert.deepEqual(files, ['src/file.ts']);
});

test('CLI plugin load errors include context and remediation', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ plugins: ['missing-plugin'] }),
  );
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      'file.ts',
      '--config',
      'designlint.config.json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Context:/);
  assert.match(res.stderr, /Remediation:/);
});

test('CLI --report outputs JSON log', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    }),
  );
  const report = path.join(dir, 'report.json');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      'file.ts',
      '--config',
      'designlint.config.json',
      '--report',
      'report.json',
      '--format',
      'json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.ok(fs.existsSync(report));
  const log = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(path.relative(dir, log[0].filePath), 'file.ts');
  assert.equal(log[0].messages[0].ruleId, 'design-system/deprecation');
});

test('CLI re-runs on file change in watch mode', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    }),
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const proc = spawn(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      'file.ts',
      '--config',
      'designlint.config.json',
      '--watch',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  proc.stdout.setEncoding('utf8');
  let runs = 0;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
    }, 5000);
    let buffer = '';
    proc.stdout.on('data', (data) => {
      buffer += data;
      if (buffer.includes('design-system/deprecation')) {
        runs++;
        buffer = '';
        if (runs === 1) {
          fs.writeFileSync(file, 'const a = "old2";');
        } else if (runs === 2) {
          proc.kill();
        }
      }
    });
    proc.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    proc.on('error', reject);
  });
  assert.equal(runs, 2);
});
