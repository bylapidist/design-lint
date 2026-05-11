/**
 * Programmatic CLI integration tests.
 *
 * Every test here uses the library API directly (createLinter, executeLint,
 * FileSource, ConfigTokenProvider) instead of spawning the compiled CLI
 * binary. This keeps tests fast, deterministic, and ensures coverage is
 * captured for the actual source files.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.js';
import { loadConfig } from '../src/config/loader.js';
import { createLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { ConfigTokenProvider } from '../src/config/config-token-provider.js';
import { NodePluginLoader } from '../src/adapters/node/plugin-loader.js';
import { getFormatter } from '../src/formatters/index.js';
import { executeLint } from '../src/cli/execute.js';
import type { LintResult } from '../src/core/types.js';
import type { Linter } from '../src/core/linter.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

function makeEnv(config: Awaited<ReturnType<typeof loadConfig>>) {
  return {
    documentSource: new FileSource(),
    pluginLoader: new NodePluginLoader(),
    tokenProvider: new ConfigTokenProvider(config),
  };
}

function makeServices(
  linter: Linter,
  formatter: (r: LintResult[]) => string,
  ignorePath?: string,
) {
  return {
    formatter,
    linterRef: { current: linter },
    state: { pluginPaths: [] as string[], ignoreFilePaths: [] as string[] },
    useColor: false,
    ignorePath,
  };
}

/** Write a minimal DTIF color tokens file. */
function writeDtifTokens(dir: string, name = 'tokens.tokens.json') {
  fs.writeFileSync(
    path.join(dir, name),
    JSON.stringify({
      $version: '1.0.0',
      color: {
        brand: { $type: 'color', $value: srgb([0, 0, 0]) },
      },
    }),
  );
}

/** Write a config + token file and return the absolute config path. */
function writeColorConfig(dir: string): string {
  writeDtifTokens(dir);
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: { default: './tokens.tokens.json' },
      rules: { 'design-token/colors': 'error' },
    }),
  );
  return configPath;
}

/** Write a config with a deprecated inline string token and return the config path.
 *
 * The deprecation rule matches against the token's string $value, so we use
 * $type: 'string' tokens. The source file should contain the old value string.
 */
function writeDeprecatedConfig(
  dir: string,
  rules: Record<string, unknown>,
): string {
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {
        $version: '1.0.0',
        colors: {
          new: { $type: 'string', $value: 'colors.new' },
          old: {
            $type: 'string',
            $value: 'colors.old',
            $deprecated: { $replacement: '#/colors/new' },
          },
        },
      },
      rules,
    }),
  );
  return configPath;
}

async function lint(
  targets: string[],
  configPath: string,
  opts: {
    fix?: boolean;
    quiet?: boolean;
    format?: string;
    maxWarnings?: number;
    output?: string;
    report?: string;
    ignorePath?: string;
    cwd?: string;
  } = {},
) {
  const cwd = opts.cwd ?? process.cwd();
  const config = await loadConfig(cwd, configPath);
  const env = makeEnv(config);
  const linter = createLinter(config, env);
  const formatter = await getFormatter(opts.format ?? 'stylish');
  const services = makeServices(
    linter,
    (r) => formatter(r, false),
    opts.ignorePath,
  );

  const logs: string[] = [];
  const errs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };
  console.error = (...args: unknown[]) => {
    errs.push(args.join(' '));
  };

  let result;
  try {
    result = await executeLint(targets, opts, services);
  } finally {
    console.log = origLog;
    console.error = origErr;
  }

  return { ...result, logs, errs };
}

// ---------------------------------------------------------------------------
// Node version check — uses run() directly (no spawn needed)
// ---------------------------------------------------------------------------

void test(
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

// ---------------------------------------------------------------------------
// Lint behaviour
// ---------------------------------------------------------------------------

void test('CLI forwards provided file targets to lint execution', async () => {
  const dir = makeTmpDir();
  const configPath = writeColorConfig(dir);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'a.css'), 'a { color: #fff; }');
  fs.writeFileSync(path.join(dir, 'src', 'b.css'), 'b { color: #fff; }');

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  const { results } = await linter.lintTargets(
    [path.join(dir, 'src', 'a.css')],
    false,
    [],
  );
  const files = results.map((r) => path.relative(dir, r.sourceId));
  assert.deepEqual(files, ['src/a.css']);
  assert.ok(
    results.some((r) =>
      r.messages.some((m) => m.ruleId === 'design-token/colors'),
    ),
  );
});

void test('CLI exits non-zero on lint errors', async () => {
  const dir = makeTmpDir();
  const configPath = writeColorConfig(dir);
  fs.writeFileSync(path.join(dir, 'bad.css'), 'a { color: #ffffff; }');

  const result = await lint([path.join(dir, 'bad.css')], configPath, {
    format: 'json',
    cwd: dir,
  });
  assert.equal(result.exitCode, 1);
});

void test('CLI warns when no files match', async () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ rules: {} }),
  );
  const configPath = path.join(dir, 'designlint.config.json');
  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  const { warning } = await linter.lintTargets(
    [path.join(dir, 'nomatch')],
    false,
    [],
  );
  assert.ok(warning?.includes('No files matched'));
});

void test('--quiet suppresses output', async () => {
  const dir = makeTmpDir();
  const configPath = writeColorConfig(dir);
  fs.writeFileSync(path.join(dir, 'bad.css'), 'a { color: #ffffff; }');

  const result = await lint([path.join(dir, 'bad.css')], configPath, {
    quiet: true,
    format: 'json',
    cwd: dir,
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.logs.length, 0);
});

void test('CLI exits 0 when warnings are within --max-warnings', async () => {
  const dir = makeTmpDir();
  const configPath = writeDeprecatedConfig(dir, {
    'design-system/deprecation': 'warn',
  });
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "colors.old";');

  const result = await lint([path.join(dir, 'file.ts')], configPath, {
    maxWarnings: 5,
    quiet: true,
    cwd: dir,
  });
  assert.equal(result.exitCode, 0);
});

void test('CLI exits 1 when warnings exceed --max-warnings', async () => {
  const dir = makeTmpDir();
  const configPath = writeDeprecatedConfig(dir, {
    'design-system/deprecation': 'warn',
  });
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "colors.old";');

  const result = await lint([path.join(dir, 'file.ts')], configPath, {
    maxWarnings: 0,
    quiet: true,
    cwd: dir,
  });
  assert.equal(result.exitCode, 1);
});

void test('CLI --fix applies fixes', async () => {
  const dir = makeTmpDir();
  const configPath = writeDeprecatedConfig(dir, {
    'design-system/deprecation': 'error',
  });
  const file = path.join(dir, 'file.ts');
  fs.writeFileSync(file, 'const a = "colors.old";');

  // CacheManager.canWriteFix checks process.cwd() as the project root, so the
  // file must be inside it. Chdir to the temp dir before running with --fix.
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    await lint(['file.ts'], configPath, { fix: true, quiet: true, cwd: dir });
  } finally {
    process.chdir(cwd);
  }
  const out = fs.readFileSync(file, 'utf8');
  assert.equal(out, "const a = 'colors.new';");
});

void test('CLI writes report to file with --output', async () => {
  const dir = makeTmpDir();
  const configPath = writeDeprecatedConfig(dir, {
    'design-system/deprecation': 'error',
  });
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "colors.old";');
  const outFile = path.join(dir, 'report.json');

  await lint([path.join(dir, 'file.ts')], configPath, {
    output: outFile,
    format: 'json',
    quiet: true,
    cwd: dir,
  });
  assert.ok(fs.existsSync(outFile));
  assert.ok(
    fs.readFileSync(outFile, 'utf8').includes('design-system/deprecation'),
  );
});

void test('CLI --report outputs JSON log', async () => {
  const dir = makeTmpDir();
  const configPath = writeDeprecatedConfig(dir, {
    'design-system/deprecation': 'error',
  });
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "colors.old";');
  const report = path.join(dir, 'report.json');

  await lint([path.join(dir, 'file.ts')], configPath, {
    report,
    format: 'json',
    quiet: true,
    cwd: dir,
  });
  assert.ok(fs.existsSync(report));
  const parsed = JSON.parse(fs.readFileSync(report, 'utf8')) as {
    results: { sourceId: string; messages: { ruleId: string }[] }[];
  };
  assert.equal(
    parsed.results[0]?.messages[0]?.ruleId,
    'design-system/deprecation',
  );
});

void test('CLI outputs SARIF format', async () => {
  const dir = makeTmpDir();
  const configPath = writeColorConfig(dir);
  fs.writeFileSync(path.join(dir, 'bad.css'), 'a { color: #ffffff; }');

  const result = await lint([path.join(dir, 'bad.css')], configPath, {
    format: 'sarif',
    cwd: dir,
  });
  assert.equal(result.exitCode, 1);
  const sarifOutput = result.logs.join('');
  const parsed = JSON.parse(sarifOutput) as { runs: { results?: unknown[] }[] };
  assert.ok(Array.isArray(parsed.runs));
  assert.ok(Array.isArray(parsed.runs[0]?.results));
});

void test('CLI ignores common directories by default', async () => {
  const dir = makeTmpDir();
  const configPath = writeDeprecatedConfig(dir, {
    'design-system/deprecation': 'error',
  });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'file.ts'), 'const a = "colors.old";');
  fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'node_modules', 'pkg', 'index.ts'),
    'const a = "colors.old";',
  );
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'dist', 'file.ts'),
    'const a = "colors.old";',
  );

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { results } = await linter.lintTargets(
      ['src', 'node_modules', 'dist'],
      false,
      [],
    );
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/file.ts']);
  } finally {
    process.chdir(cwd);
  }
});

void test('CLI --ignore-path excludes files', async () => {
  const dir = makeTmpDir();
  const configPath = writeDeprecatedConfig(dir, {
    'design-system/deprecation': 'error',
  });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'keep.ts'), 'const a = "colors.old";');
  fs.writeFileSync(path.join(dir, 'src', 'skip.ts'), 'const a = "colors.old";');
  const ignorePath = path.join(dir, '.extraignore');
  fs.writeFileSync(ignorePath, 'src/skip.ts');

  // FileSource.scan uses process.cwd() to compute relative paths for ignore
  // matching, so we must chdir to the project root before scanning.
  const cwd = process.cwd();
  process.chdir(dir);
  let result;
  try {
    result = await lint(['src'], configPath, {
      ignorePath,
      format: 'json',
      quiet: true,
      cwd: dir,
    });
  } finally {
    process.chdir(cwd);
  }
  const files = result.results
    .map((r) => path.relative(dir, r.sourceId))
    .sort();
  assert.deepEqual(files, ['src/keep.ts']);
});

void test('CLI loads formatter from module path', async () => {
  const formatterPath = path.join(
    __dirname,
    'formatters',
    'helpers',
    'fixtures',
    'custom-formatter.ts',
  );
  const dir = makeTmpDir();
  const configPath = writeDeprecatedConfig(dir, {
    'design-system/deprecation': 'error',
  });
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = "colors.old";');

  const result = await lint([path.join(dir, 'file.ts')], configPath, {
    format: formatterPath,
    cwd: dir,
  });
  assert.ok(result.logs.some((l) => l.includes('custom:')));
});

void test('CLI loads external plugin rules', async () => {
  const plugin = path.join(__dirname, 'fixtures', 'test-plugin-esm.mjs');
  const dir = makeTmpDir();
  fs.writeFileSync(path.join(dir, 'file.ts'), 'const a = 1;');
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ plugins: [plugin], rules: { 'plugin/esm': 'error' } }),
  );

  const result = await lint([path.join(dir, 'file.ts')], configPath, {
    format: 'json',
    quiet: true,
    cwd: dir,
  });
  assert.equal(result.exitCode, 1);
  assert.ok(
    result.results.some((r) =>
      r.messages.some((m) => m.ruleId === 'plugin/esm'),
    ),
  );
});

void test('CLI expands glob patterns with braces', async () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ rules: {} }),
  );
  const configPath = path.join(dir, 'designlint.config.json');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'a.module.css'), '');
  fs.writeFileSync(path.join(dir, 'src', 'b.module.scss'), '');

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { results } = await linter.lintTargets(
      ['**/*.module.{css,scss}'],
      false,
      [],
    );
    const files = results.map((r) => path.relative(dir, r.sourceId)).sort();
    assert.deepEqual(files, ['src/a.module.css', 'src/b.module.scss']);
  } finally {
    process.chdir(cwd);
  }
});

void test('CLI --concurrency limits parallel lint tasks', async () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ rules: {}, concurrency: 2 }),
  );
  const configPath = path.join(dir, 'designlint.config.json');
  for (let i = 0; i < 5; i++) {
    fs.writeFileSync(
      path.join(dir, `file${String(i)}.ts`),
      'export const x = 1;\n',
    );
  }

  const config = await loadConfig(dir, configPath);
  assert.equal(config.concurrency, 2);
  const linter = createLinter(config, makeEnv(config));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { results } = await linter.lintTargets(
      ['file0.ts', 'file1.ts', 'file2.ts'],
      false,
      [],
    );
    assert.equal(results.length, 3);
  } finally {
    process.chdir(cwd);
  }
});
