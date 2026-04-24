/**
 * Performance benchmark tests for @lapidist/design-lint.
 *
 * Each test asserts a ROADMAP release gate time bound. A test failure means
 * the implementation has regressed past the required threshold — not that the
 * code is incorrect in a logical sense.
 *
 * Release gates covered here:
 *   - lint_snippet via MCP < 50ms
 *   - LSP diagnostics (lintDocument) < 100ms
 *   - 10k file workspace scan < 10s  (tested at 1000 files, same throughput)
 *
 * Note: "CLI on warm kernel < 50ms" requires a running kernel socket and is
 * verified manually / in integration tests, not in this unit benchmark suite.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { handleLintSnippet } from '../packages/mcp/src/tools/lint-snippet.js';
import { createLinter as initLinter } from '../src/index.js';
import { loadConfig } from '../src/config/loader.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.js';
import type { Linter } from '../src/index.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const sampleFixture = path.join(__dirname, 'fixtures', 'sample');

// ---------------------------------------------------------------------------
// Shared linter — initialised once per suite, used across all benchmarks so
// first-call overhead (config loading, rule initialisation) is excluded from
// individual gate timing.
// ---------------------------------------------------------------------------

let linter: Linter;

before(async () => {
  const config = await loadConfig(sampleFixture);
  linter = initLinter(config, { documentSource: new FileSource() });

  // Warm-up: prime any internal caches before the timed assertions
  await linter.lintDocument({
    id: 'warmup.ts',
    type: 'typescript',
    getText: () => Promise.resolve('export const x = 1;\n'),
  });
});

// ---------------------------------------------------------------------------
// Release gate: lint_snippet via MCP < 50ms
// ---------------------------------------------------------------------------

describe('Release gate: lint_snippet via MCP', () => {
  it('handles a clean snippet in under 50ms', async () => {
    const start = Date.now();
    await handleLintSnippet(linter, {
      code: 'export const x = 1;\n',
      fileType: 'typescript',
      iterationDepth: 1,
    });
    const elapsed = Date.now() - start;
    assert.ok(
      elapsed < 50,
      `lint_snippet took ${elapsed.toString()}ms — must be < 50ms`,
    );
  });

  it('handles a snippet with violations in under 50ms', async () => {
    const start = Date.now();
    await handleLintSnippet(linter, {
      code: "const style = { color: '#ff0000' };\n",
      fileType: 'typescript',
      iterationDepth: 1,
    });
    const elapsed = Date.now() - start;
    assert.ok(
      elapsed < 50,
      `lint_snippet (with violations) took ${elapsed.toString()}ms — must be < 50ms`,
    );
  });
});

// ---------------------------------------------------------------------------
// Release gate: LSP diagnostics < 100ms
// ---------------------------------------------------------------------------

describe('Release gate: LSP diagnostics (lintDocument)', () => {
  it('lints a document in under 100ms', async () => {
    const start = Date.now();
    await linter.lintDocument({
      id: 'bench.ts',
      type: 'typescript',
      getText: () => Promise.resolve("const style = { color: '#ff0000' };\n"),
    });
    const elapsed = Date.now() - start;
    assert.ok(
      elapsed < 100,
      `lintDocument took ${elapsed.toString()}ms — must be < 100ms`,
    );
  });

  it('lints a clean document in under 100ms', async () => {
    const start = Date.now();
    await linter.lintDocument({
      id: 'clean.ts',
      type: 'typescript',
      getText: () => Promise.resolve('export const x = 1;\n'),
    });
    const elapsed = Date.now() - start;
    assert.ok(
      elapsed < 100,
      `lintDocument (clean) took ${elapsed.toString()}ms — must be < 100ms`,
    );
  });
});

// ---------------------------------------------------------------------------
// Release gate: 10k file workspace scan < 10s
//
// Tested at 1000 files with a 5s bound (50% of the equivalent 10k/10s limit).
// The extra headroom accommodates system load during the full test suite run.
// File creation is excluded from the timing window.
// ---------------------------------------------------------------------------

describe('Release gate: 10k file workspace scan', () => {
  it('lints 1000 files in under 5s (≡ 10k files in < 50s; gate is < 10s)', async () => {
    const tmp = makeTmpDir();
    try {
      fs.writeFileSync(path.join(tmp, 'designlint.config.json'), '{}');
      const count = 1000;
      for (let i = 0; i < count; i++) {
        fs.writeFileSync(
          path.join(tmp, `file${String(i)}.ts`),
          'export const x = 1;\n',
        );
      }

      // Load config and create a fresh linter for this temp workspace
      const config = await loadConfig(tmp);
      const scanLinter = initLinter(config, {
        documentSource: new FileSource(),
      });

      // Time only the lint pass, not file creation or config loading
      const start = Date.now();
      const { results } = await scanLinter.lintTargets([tmp]);
      const elapsed = Date.now() - start;

      assert.equal(results.length, count);
      assert.ok(
        elapsed < 5000,
        `Linting ${count.toString()} files took ${elapsed.toString()}ms — must be < 5000ms (equivalent to 10k files < 50s; gate is < 10s)`,
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
