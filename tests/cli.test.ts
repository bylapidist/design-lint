import test, { type TestOptions } from 'node:test';
import assert from 'node:assert/strict';
import {
  spawnSync,
  spawn,
  type SpawnSyncOptionsWithStringEncoding,
  type SpawnOptions,
} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.js';
import { readWhenReady } from './helpers/fs.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const cliTest = (
  name: string,
  options: TestOptions | Parameters<typeof test>[1],
  fn?: Parameters<typeof test>[1],
) =>
  typeof options === 'function'
    ? test(name, { timeout: 60_000, concurrency: true }, options)
    : test(name, { timeout: 60_000, concurrency: true, ...options }, fn);

const repoRoot = path.join(__dirname, '..');

function ensureBuiltCli() {
  const cliPath = path.join(repoRoot, 'dist', 'cli', 'index.js');
  if (fs.existsSync(cliPath)) return cliPath;

  const result = spawnSync('npm', ['run', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('Failed to build CLI for tests');
  }

  return cliPath;
}

const compiledCli = ensureBuiltCli();

type RunCliOptions = SpawnSyncOptionsWithStringEncoding & {
  nodeOptions?: string[];
};

type RunCliAsyncOptions = SpawnOptions & {
  encoding?: BufferEncoding;
  nodeOptions?: string[];
  input?: string;
};

function runCli(args: string[], options: RunCliOptions = { encoding: 'utf8' }) {
  const { nodeOptions = [], ...spawnOptions } = options;
  return spawnSync(process.execPath, [...nodeOptions, compiledCli, ...args], {
    encoding: 'utf8',
    ...spawnOptions,
  });
}

async function runCliAsync(
  args: string[],
  options: RunCliAsyncOptions = { encoding: 'utf8' },
) {
  const {
    nodeOptions = [],
    encoding = 'utf8',
    input,
    ...spawnOptions
  } = options;
  return new Promise<{ status: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(
        process.execPath,
        [...nodeOptions, compiledCli, ...args],
        {
          ...spawnOptions,
        },
      );

      let stdout = '';
      let stderr = '';
      child.stdout?.setEncoding(encoding);
      child.stderr?.setEncoding(encoding);
      child.stdout?.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr?.on('data', (chunk: string) => {
        stderr += chunk;
      });
      child.on('error', reject);
      child.on('close', (status) => {
        resolve({ status, stdout, stderr });
      });
      child.stdin?.end(input);
    },
  );
}

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

function createDeprecatedTokens() {
  return {
    $version: '1.0.0',
    old: {
      $type: 'color',
      $value: srgb([0, 0, 0]),
      $deprecated: { $replacement: '#/new' },
    },
    new: {
      $type: 'color',
      $value: srgb([1, 1, 1]),
    },
  };
}

function createDeprecatedConfig(rules: Record<string, unknown>) {
  return JSON.stringify({
    tokens: createDeprecatedTokens(),
    rules,
  });
}

void cliTest(
  'CLI aborts on unsupported Node versions',
  { concurrency: false },
  async () => {
    const { run } = await import('../src/cli/index.js');
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
  },
);

void cliTest('CLI forwards provided file targets to lint execution', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'tokens.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: {
        brand: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { default: './tokens.tokens.json' },
      rules: { 'design-token/colors': 'error' },
    }),
  );
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'a.css'), 'a { color: #fff; }');
  fs.writeFileSync(path.join(dir, 'src', 'b.css'), 'b { color: #fff; }');

  const res = runCli(
    [
      path.join('src', 'a.css'),
      '--config',
      'designlint.config.json',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  assert.equal(res.status, 1);
  const files = (JSON.parse(res.stdout) as { sourceId: string }[]).map((r) =>
    path.relative(dir, r.sourceId),
  );
  assert.deepEqual(files, ['src/a.css']);
});

void cliTest('CLI runs when executed via a symlink', () => {
  const dir = makeTmpDir();
  const link = path.join(dir, 'cli-link.js');
  fs.symlinkSync(compiledCli, link);
  const res = spawnSync(process.execPath, [link, '--help'], {
    encoding: 'utf8',
  });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage: design-lint/);
});

void cliTest('init creates json config by default', () => {
  const dir = makeTmpDir();
  const res = runCli(['init'], { cwd: dir });
  assert.equal(res.status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'designlint.config.json')));
});

void cliTest('init detects TypeScript and creates ts config', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  const res = runCli(['init'], { cwd: dir });
  assert.equal(res.status, 0);
  const cfg = path.join(dir, 'designlint.config.ts');
  assert.ok(fs.existsSync(cfg));
  const contents = fs.readFileSync(cfg, 'utf8');
  assert.ok(contents.includes('defineConfig'));
});

void cliTest('--init-format overrides detection', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  const res = runCli(['init', '--init-format', 'json'], { cwd: dir });
  assert.equal(res.status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'designlint.config.json')));
});

void cliTest('--init-format supports all formats', async () => {
  const formats: readonly ['js', 'cjs', 'mjs', 'ts', 'mts', 'json'] = [
    'js',
    'cjs',
    'mjs',
    'ts',
    'mts',
    'json',
  ];
  await Promise.all(
    formats.map(async (fmt) => {
      const dir = makeTmpDir();
      const res = await runCliAsync(['init', '--init-format', fmt], {
        cwd: dir,
      });
      assert.equal(res.status, 0);
      assert.ok(fs.existsSync(path.join(dir, `designlint.config.${fmt}`)));
    }),
  );
});

void cliTest('CLI expands glob patterns with braces', () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'a.module.css'), '');
  fs.writeFileSync(path.join(dir, 'src', 'b.module.scss'), '');
  const res = runCli(['**/*.module.{css,scss}', '--format', 'json'], {
    cwd: dir,
  });
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout) as unknown;
  const files = Array.isArray(out)
    ? (out as { sourceId: string }[])
        .map((r) => path.relative(dir, r.sourceId))
        .sort()
    : [];
  assert.deepEqual(files, ['src/a.module.css', 'src/b.module.scss']);
});

void cliTest('CLI exits non-zero on lint errors', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const result = runCli([
    path.join(fixture, 'bad.ts'),
    '--config',
    path.join(fixture, 'designlint.config.json'),
    '--format',
    'json',
  ]);
  assert.notEqual(result.status, 0);
  assert.ok(result.stdout.includes('design-token/colors'));
});

void cliTest('CLI warns when no files match', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {} }),
  );
  const res = runCli(['nomatch', '--config', 'designlint.config.json'], {
    cwd: dir,
  });
  assert.equal(res.status, 0);
  assert.match(res.stderr, /No files matched/);
});

void cliTest('--quiet suppresses "No files matched" warning', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {} }),
  );
  const res = runCli(
    ['nomatch', '--config', 'designlint.config.json', '--quiet'],
    { cwd: dir },
  );
  assert.equal(res.status, 0);
  assert.ok(!res.stderr.includes('No files matched'));
});

void cliTest('CLI exits 0 when warnings are within --max-warnings', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {} }),
  );
  const res = runCli(
    [
      'file.ts',
      '--config',
      'designlint.config.json',
      '--max-warnings',
      '0',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  assert.equal(res.status, 0);
});

void cliTest('CLI exits 0 when warnings equal --max-warnings', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    createDeprecatedConfig({ 'design-system/deprecation': 'warn' }),
  );
  const res = runCli(
    [
      'file.ts',
      '--config',
      'designlint.config.json',
      '--max-warnings',
      '1',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  assert.equal(res.status, 0);
});

void cliTest('CLI exits 1 when warnings exceed --max-warnings', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    createDeprecatedConfig({ 'design-system/deprecation': 'warn' }),
  );
  const res = runCli(
    [
      'file.ts',
      '--config',
      'designlint.config.json',
      '--max-warnings',
      '0',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  assert.equal(res.status, 1);
});

void cliTest('CLI errors on invalid --max-warnings', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {} }),
  );
  const res = runCli(
    ['file.ts', '--config', 'designlint.config.json', '--max-warnings', '-1'],
    { cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Invalid value for --max-warnings'));
});

void cliTest('CLI reports missing ignore file', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {} }),
  );
  const res = runCli(
    [
      'file.ts',
      '--config',
      'designlint.config.json',
      '--ignore-path',
      'missing.ignore',
    ],
    { cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Ignore file not found'));
});

void cliTest('CLI reports missing plugin', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: {}, rules: {}, plugins: ['./missing-plugin.js'] }),
  );
  const res = runCli(['file.ts', '--config', 'designlint.config.json'], {
    cwd: dir,
  });
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Plugin not found'));
});

void cliTest('CLI --fix applies fixes', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    createDeprecatedConfig({ 'design-system/deprecation': 'error' }),
  );
  const res = runCli(
    ['file.ts', '--config', 'designlint.config.json', '--fix'],
    { cwd: dir },
  );
  assert.equal(res.status, 0);
  const out = fs.readFileSync(path.join(dir, 'file.ts'), 'utf8');
  assert.equal(out, "const a = 'new';");
});

void cliTest('CLI surfaces config load errors', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{ invalid');
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  const res = runCli(['file.ts', '--config', 'designlint.config.json'], {
    cwd: dir,
  });
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.trim().length > 0);
});

void cliTest('CLI surfaces token parsing diagnostics', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: { default: './bad.tokens.json' }, rules: {} }),
  );
  fs.writeFileSync(
    path.join(dir, 'bad.tokens.json'),
    '{ "color": { $type: "color", }',
  );
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  const res = runCli(['file.ts', '--config', 'designlint.config.json'], {
    cwd: dir,
  });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /bad\.tokens\.json/);
  assert.match(res.stderr, /line 1, column/);
  assert.match(res.stderr, /\^/);
});

void cliTest('CLI surfaces output write errors', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  const res = runCli(['file.ts', '--output', path.join('no', 'report.txt')], {
    cwd: dir,
  });
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('ENOENT'));
});

void cliTest('CLI writes report to file with --output', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    createDeprecatedConfig({ 'design-system/deprecation': 'error' }),
  );
  const res = runCli(
    [
      'file.ts',
      '--config',
      'designlint.config.json',
      '--format',
      'json',
      '--output',
      'report.json',
    ],
    { cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.equal(res.stdout.trim(), '');
  const report = readWhenReady(path.join(dir, 'report.json'));
  assert.ok(report.includes('design-system/deprecation'));
});

void cliTest('CLI --quiet suppresses stdout output', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const res = runCli([
    path.join(fixture, 'bad.ts'),
    '--config',
    path.join(fixture, 'designlint.config.json'),
    '--quiet',
    '--format',
    'json',
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(res.stdout.trim(), '');
});

void cliTest('CLI disables colors when stdout is not a TTY', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const res = runCli(
    [
      path.join(fixture, 'bad.ts'),
      '--config',
      path.join(fixture, 'designlint.config.json'),
    ],
    {
      env: { ...process.env, FORCE_COLOR: '1' },
    },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stdout.includes('bad.ts'));
  assert.ok(!/\x1b\[[0-9;]*m/.test(res.stdout));
});

void cliTest('CLI reports unknown formatter', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const res = runCli([
    path.join(fixture, 'bad.ts'),
    '--config',
    path.join(fixture, 'designlint.config.json'),
    '--format',
    'unknown',
  ]);
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Unknown formatter'));
});

void cliTest('CLI loads formatter from module path', () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample');
  const formatterPath = path.join(
    __dirname,
    'formatters',
    'helpers',
    'fixtures',
    'custom-formatter.ts',
  );
  const res = runCli([
    path.join(fixture, 'bad.ts'),
    '--config',
    path.join(fixture, 'designlint.config.json'),
    '--format',
    formatterPath,
  ]);
  assert.notEqual(res.status, 0);
  assert.ok(res.stdout.includes('custom:1'));
});

void cliTest('CLI outputs SARIF reports', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
    fs.writeFileSync(
      path.join(dir, 'designlint.config.json'),
      createDeprecatedConfig({ 'design-system/deprecation': 'error' }),
    );
    const res = runCli(
      ['file.ts', '--config', 'designlint.config.json', '--format', 'sarif'],
      { cwd: dir },
    );
    assert.notEqual(res.status, 0);
    interface SarifReport {
      runs: { results?: unknown[] }[];
    }
    const parsed: unknown = JSON.parse(res.stdout);
    const report = parsed as SarifReport;
    assert.ok(Array.isArray(report.runs));
    assert.ok(Array.isArray(report.runs[0]?.results));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void cliTest('CLI loads external plugin rules', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  const plugin = path.join(__dirname, 'fixtures', 'test-plugin-esm.mjs');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ plugins: [plugin], rules: { 'plugin/esm': 'error' } }),
  );
  const res = runCli(
    ['file.ts', '--config', 'designlint.config.json', '--format', 'json'],
    { cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stdout.includes('plugin/esm'));
});

void cliTest('CLI reports plugin load errors', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  const badPlugin = path.join(dir, 'missing-plugin.js');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ plugins: [badPlugin] }),
  );
  const res = runCli(['file.ts', '--config', 'designlint.config.json'], {
    cwd: dir,
  });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Plugin not found/);
});

void cliTest('CLI ignores common directories by default', () => {
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
    createDeprecatedConfig({ 'design-system/deprecation': 'error' }),
  );
  const res = runCli(
    [
      'src',
      'node_modules',
      'dist',
      '--config',
      'designlint.config.json',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  interface Result {
    sourceId: string;
  }
  const parsed = JSON.parse(res.stdout) as unknown;
  assert(Array.isArray(parsed));
  const files = (parsed as Result[])
    .map((r) => path.relative(dir, r.sourceId))
    .sort();
  assert.deepEqual(files, ['src/file.ts']);
});

void cliTest('.designlintignore can unignore paths via CLI', () => {
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
    createDeprecatedConfig({ 'design-system/deprecation': 'error' }),
  );
  const res = runCli(
    [
      'src',
      'node_modules',
      '--config',
      'designlint.config.json',
      '--format',
      'json',
    ],
    {
      cwd: dir,
      env: {
        ...process.env,
        NODE_PATH: path.join(__dirname, '..', 'node_modules'),
      },
    },
  );
  interface Result {
    sourceId: string;
  }
  const parsed = JSON.parse(res.stdout) as unknown;
  assert(Array.isArray(parsed));
  const files = (parsed as Result[])
    .map((r) => path.relative(dir, r.sourceId))
    .sort();
  assert.deepEqual(files, ['node_modules/pkg/index.ts', 'src/file.ts']);
});

void cliTest('CLI skips directories listed in .designlintignore', () => {
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
    createDeprecatedConfig({ 'design-system/deprecation': 'error' }),
  );
  const res = runCli(
    [
      'src',
      'ignored',
      '--config',
      'designlint.config.json',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  interface Result {
    sourceId: string;
  }
  const parsed = JSON.parse(res.stdout) as unknown;
  assert(Array.isArray(parsed));
  const files = (parsed as Result[])
    .map((r) => path.relative(dir, r.sourceId))
    .sort();
  assert.deepEqual(files, ['src/file.ts']);
});

void cliTest('CLI --ignore-path excludes files', () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), 'const a = "old";');
  fs.writeFileSync(path.join(dir, '.extraignore'), 'src/skip.ts');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    createDeprecatedConfig({ 'design-system/deprecation': 'error' }),
  );
  const res = runCli(
    [
      'src',
      '--config',
      'designlint.config.json',
      '--format',
      'json',
      '--ignore-path',
      '.extraignore',
    ],
    { cwd: dir },
  );
  assert.notEqual(res.status, 0);
  interface Result {
    sourceId: string;
  }
  const parsed = JSON.parse(res.stdout) as unknown;
  assert(Array.isArray(parsed));
  const files = (parsed as Result[])
    .map((r) => path.relative(dir, r.sourceId))
    .sort();
  assert.deepEqual(files, ['src/keep.ts']);
});

void cliTest('CLI --concurrency limits parallel lint tasks', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');
  const count = 10;
  for (let i = 0; i < count; i++) {
    fs.writeFileSync(
      path.join(dir, `file${String(i)}.ts`),
      'export const x = 1;\n',
    );
  }
  const out = path.join(dir, 'conc.txt');
  const res = runCli(['--concurrency', '2'], {
    cwd: dir,
    env: { ...process.env, CONCURRENCY_OUTPUT: out },
    nodeOptions: [
      '--import',
      path.join(__dirname, 'helpers', 'trackConcurrency.js'),
    ],
  });
  assert.equal(res.status, 0);
  const max = parseInt(fs.readFileSync(out, 'utf8'), 10);
  assert.ok(max <= 2);
});

void cliTest('CLI errors on invalid --concurrency', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  fs.writeFileSync(path.join(dir, 'designlint.config.json'), '{}');
  const res = runCli(
    ['file.ts', '--config', 'designlint.config.json', '--concurrency', '0'],
    { cwd: dir },
  );
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Invalid value for --concurrency'));
});

void cliTest('CLI plugin load errors include context and remediation', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ plugins: ['missing-plugin'] }),
  );
  fs.writeFileSync(path.join(dir, 'file.ts'), '');
  const res = runCli(['file.ts', '--config', 'designlint.config.json'], {
    cwd: dir,
  });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Context:/);
  assert.match(res.stderr, /Remediation:/);
});

void cliTest('CLI --report outputs JSON log', () => {
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "old";');
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    createDeprecatedConfig({ 'design-system/deprecation': 'error' }),
  );
  const report = path.join(dir, 'report.json');
  runCli(
    [
      'file.ts',
      '--config',
      'designlint.config.json',
      '--report',
      'report.json',
      '--format',
      'json',
    ],
    { cwd: dir },
  );
  assert.ok(fs.existsSync(report));
  const parsed: unknown = JSON.parse(readWhenReady(report));
  const log = parsed as {
    results: { sourceId: string; messages: { ruleId: string }[] }[];
  };
  assert.equal(path.relative(dir, log.results[0]?.sourceId), 'file.ts');
  assert.equal(
    log.results[0]?.messages[0]?.ruleId,
    'design-system/deprecation',
  );
});
