import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { makeTmpDir } from '../src/utils/tmp';
import { readWhenReady } from './helpers/fs';
import { Linter } from '../src';
import type { LintResult } from '../src/core/types';

const tsNodeRegister = require.resolve('ts-node/register');

test('CLI aborts on unsupported Node versions', async () => {
  const { run } = await import('../src/cli/index');
  const original = process.versions.node;
  Object.defineProperty(process.versions, 'node', { value: '21.0.0' });
  const originalError = console.error;
  let out = '';
  console.error = (msg?: unknown) => {
    out += String(msg);
  };
  const originalExit = process.exitCode;
  await run([]);
  Object.defineProperty(process.versions, 'node', { value: original });
  console.error = originalError;
  assert.equal(process.exitCode, 1);
  process.exitCode = originalExit ?? 0;
  assert.match(out, /Node\.js v21\.0\.0 is not supported/);
});

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

test('CLI exits 0 when warnings are within --max-warnings', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {} }),
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
      '--max-warnings',
      '0',
      '--format',
      'json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.equal(res.status, 0);
});

test('CLI exits 0 when warnings equal --max-warnings', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'warn' },
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
      '--max-warnings',
      '1',
      '--format',
      'json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.equal(res.status, 0);
});

test('CLI exits 1 when warnings exceed --max-warnings', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'warn' },
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
      '--max-warnings',
      '0',
      '--format',
      'json',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.equal(res.status, 1);
});

test('CLI errors on invalid --max-warnings', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {} }),
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
      '--max-warnings',
      '-1',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('non-negative integer'));
});

test('CLI --fix applies fixes', () => {
  const dir = makeTmpDir();
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
  const dir = makeTmpDir();
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
  const dir = makeTmpDir();
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
  const dir = makeTmpDir();
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
  const report = readWhenReady(path.join(dir, 'report.json'));
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

test('CLI disables colors when stdout is not a TTY', () => {
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
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '1' },
    },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stdout.includes('bad.ts'));
  assert.ok(!/\x1b\[[0-9;]*m/.test(res.stdout));
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

test('CLI outputs SARIF reports', () => {
  const dir = makeTmpDir();
  try {
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
        'sarif',
      ],
      { encoding: 'utf8', cwd: dir },
    );
    assert.notEqual(res.status, 0);
    const report = JSON.parse(res.stdout);
    assert.ok(Array.isArray(report.runs));
    assert.ok(Array.isArray(report.runs[0].results));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI loads external plugin rules', () => {
  const dir = makeTmpDir();
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
  const dir = makeTmpDir();
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
  const dir = makeTmpDir();
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
  const dir = makeTmpDir();
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
  const dir = makeTmpDir();
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

test('CLI --ignore-path excludes files', () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, '.extraignore'), 'src/skip.ts');
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
      '--config',
      'designlint.config.json',
      '--format',
      'json',
      '--ignore-path',
      '.extraignore',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.notEqual(res.status, 0);
  interface Result {
    filePath: string;
  }
  const parsed: Result[] = JSON.parse(res.stdout);
  const files = parsed.map((r) => path.relative(dir, r.filePath)).sort();
  assert.deepEqual(files, ['src/keep.ts']);
});

test('CLI --concurrency limits parallel lint tasks', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');
  const count = 10;
  for (let i = 0; i < count; i++) {
    fs.writeFileSync(path.join(dir, `file${i}.ts`), 'export const x = 1;\n');
  }
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const out = path.join(dir, 'conc.txt');
  const res = spawnSync(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      '--require',
      path.join(__dirname, 'helpers', 'trackConcurrency.ts'),
      cli,
      '--concurrency',
      '2',
    ],
    {
      encoding: 'utf8',
      cwd: dir,
      env: { ...process.env, CONCURRENCY_OUTPUT: out },
    },
  );
  assert.equal(res.status, 0);
  const max = parseInt(fs.readFileSync(out, 'utf8'), 10);
  assert.ok(max <= 2);
});

test('CLI errors on invalid --concurrency', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');
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
      '--concurrency',
      '0',
    ],
    { encoding: 'utf8', cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('positive integer'));
});

test('CLI plugin load errors include context and remediation', () => {
  const dir = makeTmpDir();
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
  const dir = makeTmpDir();
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
  const log = JSON.parse(readWhenReady(report));
  assert.equal(path.relative(dir, log[0].filePath), 'file.ts');
  assert.equal(log[0].messages[0].ruleId, 'design-system/deprecation');
});

test('CLI re-runs on file change in watch mode', async () => {
  const dir = makeTmpDir();
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

test('CLI cache updates after --fix run', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = "old";');
  const config = {
    tokens: { deprecations: { old: { replacement: 'new' } } },
    rules: { 'design-system/deprecation': 'error' },
  };
  const linter = new Linter(config);
  const cache = new Map<string, { mtime: number; result: LintResult }>();
  const { results: res1 } = await linter.lintFiles([file], true, cache);
  const { results: res2 } = await linter.lintFiles([file], false, cache);
  assert.equal(res1[0].messages.length, 0);
  assert.strictEqual(res1[0], res2[0]);
});

test('CLI --cache reuses results from disk', () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = 1;');
  const plugin = path.join(dir, 'plugin.cjs');
  fs.writeFileSync(
    plugin,
    `const fs = require('fs');\nconst path = require('path');\nconst counter = path.join(__dirname, 'count.txt');\nmodule.exports = {\n  rules: [{\n    name: 'test/count',\n    meta: { description: 'count' },\n    create() {\n      const c = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0;\n      fs.writeFileSync(counter, String(c + 1));\n      return {};\n    },\n  }],\n};\n`,
  );
  fs.writeFileSync(path.join(dir, 'count.txt'), '0');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {},
      rules: { 'test/count': 'error' },
      plugins: ['./plugin.cjs'],
    }),
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const args = [
    '--require',
    tsNodeRegister,
    cli,
    'file.ts',
    '--config',
    'designlint.config.json',
    '--cache',
  ];
  let res = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'count.txt'), 'utf8'), '1');
  res = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'count.txt'), 'utf8'), '1');
});

test('CLI --cache invalidates when files change', () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = 1;');
  const plugin = path.join(dir, 'plugin.cjs');
  fs.writeFileSync(
    plugin,
    `const fs = require('fs');\nconst path = require('path');\nconst counter = path.join(__dirname, 'count.txt');\nmodule.exports = {\n  rules: [{\n    name: 'test/count',\n    meta: { description: 'count' },\n    create() {\n      const c = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0;\n      fs.writeFileSync(counter, String(c + 1));\n      return {};\n    },\n  }],\n};\n`,
  );
  fs.writeFileSync(path.join(dir, 'count.txt'), '0');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {},
      rules: { 'test/count': 'error' },
      plugins: ['./plugin.cjs'],
    }),
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const args = [
    '--require',
    tsNodeRegister,
    cli,
    'file.ts',
    '--config',
    'designlint.config.json',
    '--cache',
  ];
  let res = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'count.txt'), 'utf8'), '1');
  fs.appendFileSync(file, '\nconst b = 2;');
  res = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'count.txt'), 'utf8'), '2');
});

test('CLI re-runs with updated config in watch mode', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = "old";');
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: {},
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
  let saw = false;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
    }, 5000);
    let buffer = '';
    proc.stdout.on('data', (data) => {
      buffer += data;
      if (buffer.includes('Watching for changes...')) {
        fs.writeFileSync(
          configPath,
          JSON.stringify({
            tokens: { deprecations: { old: { replacement: 'new' } } },
            rules: { 'design-system/deprecation': 'error' },
          }),
        );
        buffer = '';
      } else if (buffer.includes('design-system/deprecation')) {
        saw = true;
        proc.kill();
      }
    });
    proc.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    proc.on('error', reject);
  });
  assert.equal(saw, true);
});

test('CLI reloads plugins on change in watch mode', async () => {
  const dir = makeTmpDir();
  const pluginPath = path.join(dir, 'plugin.js');
  const pluginContent = (msg: string) => `const ts = require('typescript');
module.exports = { rules: [{ name: 'plugin/test', meta: { description: 'test rule' }, create(context) { return { onNode(node) { if (node.kind === ts.SyntaxKind.SourceFile) { context.report({ message: '${msg}', line: 1, column: 1 }); } } }; } }] };`;
  fs.writeFileSync(pluginPath, pluginContent('first'));
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      plugins: ['./plugin.js'],
      rules: { 'plugin/test': 'error' },
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
      if (buffer.includes('first')) {
        runs++;
        fs.writeFileSync(pluginPath, pluginContent('second'));
        buffer = '';
      } else if (buffer.includes('second')) {
        runs++;
        proc.kill();
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

test('CLI reloads ESM plugins on change in watch mode', async () => {
  const dir = makeTmpDir();
  const pluginPath = path.join(dir, 'plugin.mjs');
  const pluginContent = (msg: string) => `import ts from 'typescript';
export const plugin = {
  rules: [{
    name: 'plugin/test',
    meta: { description: 'test rule' },
    create(context) {
      return {
        onNode(node) {
          if (node.kind === ts.SyntaxKind.SourceFile) {
            context.report({ message: '${msg}', line: 1, column: 1 });
          }
        },
      };
    },
  }],
};
export default plugin;`;
  fs.writeFileSync(pluginPath, pluginContent('first'));
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      plugins: ['./plugin.mjs'],
      rules: { 'plugin/test': 'error' },
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
      if (buffer.includes('first')) {
        runs++;
        fs.writeFileSync(pluginPath, pluginContent('second'));
        buffer = '';
      } else if (buffer.includes('second')) {
        runs++;
        proc.kill();
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

test('CLI continues watching after plugin load failure', async () => {
  const dir = makeTmpDir();
  const pluginPath = path.join(dir, 'plugin.js');
  const pluginContent = (msg: string) => `const ts = require('typescript');
module.exports = { rules: [{ name: 'plugin/test', meta: { description: 'test rule' }, create(context) { return { onNode(node) {
if (node.kind === ts.SyntaxKind.SourceFile) { context.report({ message: '${msg}', line: 1, column: 1 }); } } }; } }] };`;
  fs.writeFileSync(pluginPath, pluginContent('first'));
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      plugins: ['./plugin.js'],
      rules: { 'plugin/test': 'error' },
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
      '--no-color',
    ],
    { cwd: dir },
  );
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');
  let sawError = false;
  let sawSecond = false;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
    }, 10000);
    let stdout = '';
    proc.stdout.on('data', (data) => {
      stdout += data;
      if (stdout.includes('Watching for changes...')) {
        fs.writeFileSync(pluginPath, "throw new Error('bad plugin');");
        stdout = '';
      } else if (stdout.includes('second')) {
        sawSecond = true;
        proc.kill('SIGINT');
      }
    });
    proc.stderr.on('data', (data) => {
      const str = data.toString();
      if (!sawError && str.includes('bad plugin')) {
        sawError = true;
        fs.writeFileSync(pluginPath, pluginContent('second'));
      }
    });
    proc.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    proc.on('error', reject);
  });
  assert.equal(sawError, true);
  assert.equal(sawSecond, true);
});

test('CLI reloads when nested ignore file changes in watch mode', async () => {
  const dir = makeTmpDir();
  const nested = path.join(dir, 'nested');
  fs.mkdirSync(nested);
  const file = path.join(nested, 'file.ts');
  fs.writeFileSync(file, 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    }),
  );
  const ignorePath = path.join(nested, '.designlintignore');
  fs.writeFileSync(ignorePath, 'file.ts\n');
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const proc = spawn(
    process.execPath,
    [
      '--require',
      tsNodeRegister,
      cli,
      'nested',
      '--config',
      'designlint.config.json',
      '--watch',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  proc.stdout.setEncoding('utf8');
  let saw = false;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
    }, 5000);
    let buffer = '';
    proc.stdout.on('data', (data) => {
      buffer += data;
      if (buffer.includes('Watching for changes...')) {
        fs.writeFileSync(ignorePath, '');
        buffer = '';
      } else if (buffer.includes('design-system/deprecation')) {
        saw = true;
        proc.kill();
      }
    });
    proc.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    proc.on('error', reject);
  });
  assert.equal(saw, true);
});

test('CLI updates ignore list when .gitignore changes in watch mode', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { deprecations: { old: { replacement: 'new' } } },
      rules: { 'design-system/deprecation': 'error' },
    }),
  );
  fs.writeFileSync(path.join(dir, '.gitignore'), '');
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
  let ignored = false;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
    }, 5000);
    let buffer = '';
    proc.stdout.on('data', (data) => {
      buffer += data;
      if (buffer.includes('design-system/deprecation')) {
        fs.writeFileSync(path.join(dir, '.gitignore'), 'file.ts\n');
        buffer = '';
      } else if (buffer.includes('Watching for changes...')) {
        buffer = '';
      } else if (buffer.includes('[]')) {
        ignored = true;
        proc.kill();
      }
    });
    proc.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    proc.on('error', reject);
  });
  assert.equal(ignored, true);
});

test('CLI clears cache when a watched file is deleted', async () => {
  const dir = makeTmpDir();
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
  let sawEmpty = false;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
    }, 5000);
    let buffer = '';
    proc.stdout.on('data', (data) => {
      buffer += data;
      if (buffer.includes('design-system/deprecation')) {
        fs.unlinkSync(file);
        buffer = '';
      } else if (buffer.includes('Watching for changes...')) {
        buffer = '';
      } else if (buffer.includes('[]')) {
        sawEmpty = true;
        proc.kill();
      }
    });
    proc.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    proc.on('error', reject);
  });
  assert.equal(sawEmpty, true);
});

test('CLI continues linting after deleting a watched file', async () => {
  const dir = makeTmpDir();
  const fileA = path.join(dir, 'a.ts');
  const fileB = path.join(dir, 'b.ts');
  fs.writeFileSync(fileA, 'const a = "old";');
  fs.writeFileSync(fileB, 'const b = "old";');
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
      'a.ts',
      'b.ts',
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
      if (buffer.includes('Watching for changes...')) {
        buffer = '';
      } else if (buffer.includes('design-system/deprecation')) {
        runs++;
        if (runs === 1) {
          fs.unlinkSync(fileA);
          buffer = '';
        } else if (runs === 2) {
          assert.ok(buffer.includes('b.ts'));
          assert.ok(!buffer.includes('a.ts'));
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

test('CLI closes watcher on SIGINT', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {} }),
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
  let exitCode: number | null = null;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Timed out'));
    }, 5000);
    let buffer = '';
    proc.stdout.on('data', (data) => {
      buffer += data;
      if (buffer.includes('Watching for changes...')) {
        proc.kill('SIGINT');
      }
    });
    proc.on('exit', (code) => {
      exitCode = code;
      clearTimeout(timer);
      resolve();
    });
    proc.on('error', reject);
  });
  assert.equal(exitCode, 0);
});

test('CLI handles errors from watch callbacks', async () => {
  const dir = makeTmpDir();
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = 1;');
  const plugin = path.join(dir, 'plugin.cjs');
  fs.writeFileSync(
    plugin,
    `module.exports = {\n  rules: [{\n    name: 'test/crash',\n    meta: { description: 'crash' },\n    create() {\n      return {\n        onNode(node) {\n          if (node.getText().includes('CRASH')) {\n            throw new Error('boom');\n          }\n        },\n      };\n    },\n  }],\n};\n`,
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: {},
      rules: { 'test/crash': 'error' },
      plugins: ['./plugin.cjs'],
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
  proc.stderr.setEncoding('utf8');
  let stderr = '';
  let exitCode: number | null = null;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Timed out'));
    }, 5000);
    let buffer = '';
    proc.stdout.on('data', (data) => {
      buffer += data;
      if (buffer.includes('Watching for changes...')) {
        fs.writeFileSync(file, 'const CRASH = 1;');
      }
    });
    proc.stderr.on('data', (data) => {
      stderr += data;
      if (stderr.includes('boom')) {
        proc.kill('SIGINT');
      }
    });
    proc.on('exit', (code) => {
      exitCode = code;
      clearTimeout(timer);
      resolve();
    });
    proc.on('error', reject);
  });
  assert.equal(exitCode, 1);
  assert.ok(stderr.includes('boom'));
  assert.ok(!stderr.includes('UnhandledPromise'));
});
