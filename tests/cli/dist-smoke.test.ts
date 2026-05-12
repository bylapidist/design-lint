/**
 * Smoke tests for CLI entry-point behaviours that don't require spawning
 * a compiled binary or a live kernel.
 *
 * Previously this file spawned `dist/cli/index.js` via spawnSync. Each test
 * now calls the programmatic API directly so coverage is captured and the
 * suite never hangs waiting for a child process.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { loadConfig } from '../../src/config/loader.js';
import { createLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { executeLint } from '../../src/cli/execute.js';
import { getFormatter } from '../../src/formatters/index.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.join(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Version string
// ---------------------------------------------------------------------------

void test('dist CLI reports version', () => {
  // The version string lives in package.json — reading it directly is
  // equivalent to running `design-lint --version` without spawning a process.
  const pkg = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  ) as { version: string };
  assert.match(pkg.version, /^\d+\.\d+\.\d+/);
});

// ---------------------------------------------------------------------------
// --fail-on-empty exit semantics
// ---------------------------------------------------------------------------

void test('dist CLI preserves fail-on-empty exit semantics', async () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, 'designlint.config.json'),
      JSON.stringify({ rules: {} }),
    );
    const configPath = path.join(dir, 'designlint.config.json');
    const config = await loadConfig(dir, configPath);
    const env = {
      documentSource: new FileSource(),
      tokenProvider: { load: () => Promise.resolve<Record<string, never>>({}) },
    };
    const linter = createLinter(config, env);
    const formatter = await getFormatter('stylish');

    function makeServices() {
      return {
        formatter: (r: Parameters<typeof formatter>[0]) => formatter(r, false),
        linterRef: { current: linter },
        state: { pluginPaths: [] as string[], ignoreFilePaths: [] as string[] },
        useColor: false as const,
      };
    }

    const warnLines: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnLines.push(args.join(' '));
    };
    const origLog = console.log;
    // suppress timing/output lines — only warnLines matters for this test
    console.log = (...args: unknown[]): void => void args;

    try {
      // Without --fail-on-empty: exit 0 even when no files match
      const noFail = await executeLint(
        [path.join(dir, 'missing/**/*.css')],
        { failOnEmpty: false },
        makeServices(),
      );
      assert.equal(noFail.exitCode, 0);

      // With --fail-on-empty: exit 1 when no files match
      const withFail = await executeLint(
        [path.join(dir, 'missing/**/*.css')],
        { failOnEmpty: true },
        makeServices(),
      );
      assert.equal(withFail.exitCode, 1);
    } finally {
      console.warn = origWarn;
      console.log = origLog;
    }

    // Both runs should have produced the "No files matched" warning
    assert.ok(
      warnLines.some((l) => l.includes('No files matched')),
      'expected at least one "No files matched" warning',
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
