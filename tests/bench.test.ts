/**
 * Performance benchmark tests for @lapidist/design-lint.
 *
 * Each test asserts a ROADMAP release gate time bound. A test failure means
 * the implementation has regressed past the required threshold — not that the
 * code is incorrect in a logical sense.
 *
 * Release gates covered here:
 *   - CLI on warm kernel < 50ms  (skipped when no kernel socket is present)
 *   - lint_snippet via MCP < 50ms
 *   - LSP diagnostics (lintDocument) < 100ms
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { handleLintSnippet } from '../packages/mcp/src/tools/lint-snippet.js';
import { createLinter as initLinter } from '../src/index.js';
import { loadConfig } from '../src/config/loader.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import type { Linter } from '../src/index.js';
import { createConfigTokenProvider } from './helpers/token-provider.js';

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
  linter = initLinter(config, {
    documentSource: new FileSource(),
    tokenProvider: createConfigTokenProvider(config),
  });

  // Warm-up: prime any internal caches before the timed assertions
  await linter.lintDocument({
    id: 'warmup.ts',
    type: 'typescript',
    getText: () => Promise.resolve('export const x = 1;\n'),
  });
});

// ---------------------------------------------------------------------------
// Release gate: CLI on warm kernel < 50ms
//
// Requires a running DSR kernel at /tmp/designlint-kernel.sock. The test is
// skipped automatically when no socket is present so the suite can run in
// pure unit-test environments. The cli-smoke.yml CI workflow starts the kernel
// before running the full test suite, so this gate is exercised in CI.
// ---------------------------------------------------------------------------

describe(
  'Release gate: CLI on warm kernel',
  { skip: !fs.existsSync('/tmp/designlint-kernel.sock') },
  () => {
    it('lintDocument via DsrTokenProvider in under 50ms', async () => {
      const { createNodeEnvironment } =
        await import('../src/adapters/node/environment.js');
      const config = await loadConfig(sampleFixture);
      const env = createNodeEnvironment(config, {
        dsr: {
          socketPath: '/tmp/designlint-kernel.sock',
          connectTimeoutMs: 2000,
        },
      });
      const kernelLinter = initLinter(config, env);
      // Warm up — connect + load tokens before the timed assertion.
      await kernelLinter.lintDocument({
        id: 'warmup-kernel.ts',
        type: 'typescript',
        getText: () => Promise.resolve('export const x = 1;\n'),
      });

      const start = Date.now();
      await kernelLinter.lintDocument({
        id: 'bench-kernel.ts',
        type: 'typescript',
        getText: () => Promise.resolve("const style = { color: '#ff0000' };\n"),
      });
      const elapsed = Date.now() - start;
      assert.ok(
        elapsed < 50,
        `CLI on warm kernel took ${elapsed.toString()}ms — must be < 50ms`,
      );
    });
  },
);

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
