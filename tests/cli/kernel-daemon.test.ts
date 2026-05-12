/**
 * Tests for the kernel-daemon entry point.
 *
 * Passes a stub KernelProcess constructor directly to startDaemon — no
 * module mocking needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { startDaemon } from '../../src/cli/kernel-daemon.js';

// ---------------------------------------------------------------------------
// Stub KernelProcess
// ---------------------------------------------------------------------------

interface CapturedOptions {
  socketPath?: string;
  httpPort?: number;
  pidFile?: string;
  enableHttp?: boolean;
}

function makeStubKernel() {
  let startCalled = false;
  let capturedOptions: CapturedOptions = {};

  const Ctor = class {
    constructor(options: CapturedOptions) {
      capturedOptions = options;
    }
    start(): Promise<void> {
      startCalled = true;
      return Promise.resolve();
    }
  };

  return {
    Ctor,
    get startCalled() {
      return startCalled;
    },
    get capturedOptions() {
      return capturedOptions;
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureLog(fn: () => Promise<void>): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.join(' '));
    };
    fn()
      .then(() => {
        console.log = origLog;
        resolve(lines);
      })
      .catch((err: unknown) => {
        console.log = origLog;
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void test('startDaemon starts the kernel process', async () => {
  const stub = makeStubKernel();
  await startDaemon([], stub.Ctor);
  assert.ok(stub.startCalled);
});

void test('startDaemon parses --socket-path argument', async () => {
  const stub = makeStubKernel();
  await startDaemon(['--socket-path', '/tmp/test.sock'], stub.Ctor);
  assert.equal(stub.capturedOptions.socketPath, '/tmp/test.sock');
});

void test('startDaemon parses --http-port argument', async () => {
  const stub = makeStubKernel();
  await startDaemon(['--http-port', '9998'], stub.Ctor);
  assert.equal(stub.capturedOptions.httpPort, 9998);
});

void test('startDaemon parses --pid-file argument', async () => {
  const stub = makeStubKernel();
  await startDaemon(['--pid-file', '/tmp/test.pid'], stub.Ctor);
  assert.equal(stub.capturedOptions.pidFile, '/tmp/test.pid');
});

void test('startDaemon disables HTTP when --no-http is set', async () => {
  const stub = makeStubKernel();
  await startDaemon(['--no-http'], stub.Ctor);
  assert.equal(stub.capturedOptions.enableHttp, false);
});

void test('startDaemon enables HTTP by default', async () => {
  const stub = makeStubKernel();
  await startDaemon([], stub.Ctor);
  assert.equal(stub.capturedOptions.enableHttp, true);
});

void test('startDaemon logs startup message', async () => {
  const stub = makeStubKernel();
  const lines = await captureLog(() => startDaemon([], stub.Ctor));
  assert.ok(lines.some((l) => l.includes('[kernel-daemon] started')));
});

void test('startDaemon writes PID to ready file when --ready-file is provided', async () => {
  const stub = makeStubKernel();
  const dir = path.join(tmpdir(), `daemon-ready-${Date.now().toString()}`);
  fs.mkdirSync(dir, { recursive: true });
  const readyFile = path.join(dir, 'kernel.ready');

  try {
    await startDaemon(['--ready-file', readyFile], stub.Ctor);
    const content = fs.readFileSync(readyFile, 'utf8');
    assert.equal(content, String(process.pid));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

void test('startDaemon continues when ready file write fails', async () => {
  const stub = makeStubKernel();
  // Use a path with a non-existent parent directory to trigger a write failure
  const readyFile = path.join(
    tmpdir(),
    `nonexistent-${Date.now().toString()}`,
    'no-parent',
    'kernel.ready',
  );
  // Should not throw — write failure is non-fatal
  await assert.doesNotReject(() =>
    startDaemon(['--ready-file', readyFile], stub.Ctor),
  );
});

void test('startDaemon bootstraps tokens from --config-path', async () => {
  const dir = path.join(tmpdir(), `daemon-bootstrap-${Date.now().toString()}`);
  fs.mkdirSync(dir, { recursive: true });

  const tokensFile = path.join(dir, 'tokens.tokens.json');
  fs.writeFileSync(
    tokensFile,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    }),
  );
  const configFile = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configFile,
    JSON.stringify({ tokens: { default: './tokens.tokens.json' }, rules: {} }),
  );

  const addedTokens: { pointer: string }[] = [];
  const BootstrapCtor = class {
    start(): Promise<void> {
      return Promise.resolve();
    }
    addToken(pointer: string): void {
      addedTokens.push({ pointer });
    }
  };

  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };
  try {
    await startDaemon(['--config-path', configFile], BootstrapCtor);
  } finally {
    console.log = origLog;
    fs.rmSync(dir, { recursive: true, force: true });
  }

  assert.ok(
    addedTokens.some((t) => t.pointer === '#/color/primary'),
    'expected color/primary token to be injected',
  );
  assert.ok(logs.some((l) => l.includes('bootstrapped')));
});
