/**
 * Unit tests for executeLint — uses a stub linter to avoid kernel dependency.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { executeLint, type ExecuteServices } from '../../src/cli/execute.js';
import type { LintResult } from '../../src/core/types.js';
import type { Linter } from '../../src/core/linter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StubLintTargetsResult {
  results: LintResult[];
  ignoreFiles: string[];
  warning?: string;
}

function makeStubLinter(response: StubLintTargetsResult) {
  return {
    lintTargets: () => Promise.resolve(response),
  } as unknown as Linter;
}

function makeServices(
  linter: Linter,
  overrides?: Partial<ExecuteServices>,
): ExecuteServices {
  return {
    formatter: (results) => JSON.stringify(results),
    linterRef: { current: linter },
    state: { pluginPaths: [], ignoreFilePaths: [] },
    useColor: false,
    ...overrides,
  };
}

function noop(): void {
  /* intentionally empty */
}

function suppressConsole(fn: () => Promise<unknown>): Promise<unknown> {
  const origLog = console.log;
  const origWarn = console.warn;
  console.log = noop;
  console.warn = noop;
  return fn().finally(() => {
    console.log = origLog;
    console.warn = origWarn;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void test('executeLint returns zero exitCode when no errors', async () => {
  const linter = makeStubLinter({
    results: [{ sourceId: 'app.tsx', messages: [] }],
    ignoreFiles: [],
  });
  const result = (await suppressConsole(() =>
    executeLint(['app.tsx'], {}, makeServices(linter)),
  )) as Awaited<ReturnType<typeof executeLint>>;
  assert.equal(result.exitCode, 0);
  assert.equal(result.results.length, 1);
});

void test('executeLint returns non-zero exitCode when results have errors', async () => {
  const linter = makeStubLinter({
    results: [
      {
        sourceId: 'bad.tsx',
        messages: [
          {
            ruleId: 'test',
            message: 'bad',
            severity: 'error',
            line: 1,
            column: 1,
          },
        ],
      },
    ],
    ignoreFiles: [],
  });
  const result = (await suppressConsole(() =>
    executeLint(['bad.tsx'], {}, makeServices(linter)),
  )) as Awaited<ReturnType<typeof executeLint>>;
  assert.equal(result.exitCode, 1);
});

void test('executeLint passes warning message to console.warn when not quiet', async () => {
  const linter = makeStubLinter({
    results: [],
    ignoreFiles: [],
    warning: 'No files matched the provided patterns.',
  });
  const warnings: string[] = [];
  const origWarn = console.warn;
  const origLog = console.log;
  console.warn = (msg: unknown) => {
    warnings.push(String(msg));
  };
  console.log = noop;
  try {
    await executeLint(['*.ts'], { quiet: false }, makeServices(linter));
  } finally {
    console.warn = origWarn;
    console.log = origLog;
  }
  assert.ok(warnings.length > 0);
});

void test('executeLint sets exitCode=1 when failOnEmpty and no files matched', async () => {
  const linter = makeStubLinter({
    results: [],
    ignoreFiles: [],
    warning: 'No files matched the provided patterns.',
  });
  const result = (await suppressConsole(() =>
    executeLint(['*.ts'], { failOnEmpty: true }, makeServices(linter)),
  )) as Awaited<ReturnType<typeof executeLint>>;
  assert.equal(result.exitCode, 1);
});

void test('executeLint sets exitCode=1 when warning count exceeds maxWarnings', async () => {
  const linter = makeStubLinter({
    results: [
      {
        sourceId: 'app.tsx',
        messages: [
          {
            ruleId: 'test',
            message: 'warn1',
            severity: 'warn',
            line: 1,
            column: 1,
          },
          {
            ruleId: 'test',
            message: 'warn2',
            severity: 'warn',
            line: 2,
            column: 1,
          },
        ],
      },
    ],
    ignoreFiles: [],
  });
  const result = (await suppressConsole(() =>
    executeLint(['app.tsx'], { maxWarnings: 1 }, makeServices(linter)),
  )) as Awaited<ReturnType<typeof executeLint>>;
  assert.equal(result.exitCode, 1);
});

void test('executeLint writes output to file when opts.output is set', async () => {
  const dir = path.join(tmpdir(), `execute-test-${Date.now().toString()}`);
  fs.mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, 'results.json');
  const linter = makeStubLinter({
    results: [{ sourceId: 'app.tsx', messages: [] }],
    ignoreFiles: [],
  });

  try {
    await executeLint(
      ['app.tsx'],
      { output: outFile, quiet: true },
      makeServices(linter),
    );
    const content = fs.readFileSync(outFile, 'utf8');
    assert.ok(content.includes('app.tsx'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('executeLint writes report to file when opts.report is set', async () => {
  const dir = path.join(tmpdir(), `execute-report-${Date.now().toString()}`);
  fs.mkdirSync(dir, { recursive: true });
  const reportFile = path.join(dir, 'report.json');
  const linter = makeStubLinter({
    results: [{ sourceId: 'app.tsx', messages: [] }],
    ignoreFiles: ['node_modules'],
  });

  try {
    await suppressConsole(() =>
      executeLint(['app.tsx'], { report: reportFile }, makeServices(linter)),
    );
    const content = JSON.parse(fs.readFileSync(reportFile, 'utf8')) as {
      results: unknown[];
      ignoreFiles: string[];
    };
    assert.equal(content.results.length, 1);
    assert.deepEqual(content.ignoreFiles, ['node_modules']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('executeLint reads baseline file and passes to policy enforcement', async () => {
  const dir = path.join(tmpdir(), `execute-baseline-${Date.now().toString()}`);
  fs.mkdirSync(dir, { recursive: true });
  const baselineFile = path.join(dir, 'baseline.json');
  fs.writeFileSync(
    baselineFile,
    JSON.stringify({ totalCount: 10, score: 0.9 }),
  );

  const linter = makeStubLinter({
    results: [{ sourceId: 'app.tsx', messages: [] }],
    ignoreFiles: [],
  });
  // Minimal policy that won't throw — tokenCoverage: {} and a ratchet with
  // a mode that allows any count change (maxDelta is high so it passes).
  const fakePolicy = {
    tokenCoverage: {},
    requiredRules: [],
    minSeverity: {},
    ratchet: { mode: 'metric', maxDelta: 999999 },
    agentPolicy: undefined,
  };

  try {
    await suppressConsole(() =>
      executeLint(
        ['app.tsx'],
        { baseline: baselineFile },
        makeServices(linter, { policy: fakePolicy as never }),
      ),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('executeLint handles missing baseline file gracefully', async () => {
  const linter = makeStubLinter({
    results: [{ sourceId: 'app.tsx', messages: [] }],
    ignoreFiles: [],
  });
  // Minimal policy — baseline reading is inside the policy check block.
  const fakePolicy = {
    tokenCoverage: {},
    requiredRules: [],
    minSeverity: {},
    ratchet: undefined,
    agentPolicy: undefined,
  };
  // Non-existent baseline file should not throw — catch block silences the error.
  const result = (await suppressConsole(() =>
    executeLint(
      ['app.tsx'],
      { baseline: '/nonexistent/path/baseline.json' },
      makeServices(linter, { policy: fakePolicy as never }),
    ),
  )) as Awaited<ReturnType<typeof executeLint>>;
  assert.equal(result.exitCode, 0);
});

void test('executeLint quiet mode suppresses output', async () => {
  const linter = makeStubLinter({
    results: [{ sourceId: 'app.tsx', messages: [] }],
    ignoreFiles: [],
  });
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (msg: unknown) => {
    logs.push(String(msg));
  };
  try {
    await executeLint(['app.tsx'], { quiet: true }, makeServices(linter));
  } finally {
    console.log = origLog;
  }
  // In quiet mode, no output should be written to console.log
  assert.equal(logs.length, 0);
});
