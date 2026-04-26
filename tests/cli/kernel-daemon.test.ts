/**
 * Tests for the kernel-daemon entry point.
 *
 * Passes a stub KernelProcess constructor directly to startDaemon — no
 * module mocking needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
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
