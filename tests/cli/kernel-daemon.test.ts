/**
 * Tests for the kernel-daemon entry point.
 *
 * Mocks KernelProcess from @lapidist/dsr so no real kernel is started.
 * Because kernel-daemon.ts uses top-level await at module scope, the mock
 * must be registered before the module is imported.
 */
import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Mock KernelProcess
// ---------------------------------------------------------------------------

interface CapturedOptions {
  socketPath?: string;
  httpPort?: number;
  pidFile?: string;
  enableHttp?: boolean;
}

let capturedOptions: CapturedOptions = {};
let kernelStarted = false;

class MockKernelProcess {
  constructor(options: CapturedOptions) {
    capturedOptions = options;
  }

  start(): Promise<void> {
    kernelStarted = true;
    return Promise.resolve();
  }
}

mock.module('@lapidist/dsr', {
  namedExports: {
    KernelProcess: MockKernelProcess,
  },
});

// ---------------------------------------------------------------------------
// Import kernel-daemon with custom argv so we exercise arg parsing
// ---------------------------------------------------------------------------

const origArgv = process.argv;
process.argv = [
  'node',
  'kernel-daemon.js',
  '--socket-path',
  '/tmp/test-daemon.sock',
  '--http-port',
  '9998',
  '--pid-file',
  '/tmp/test-daemon.pid',
];

const logLines: string[] = [];
const origLog = console.log;
console.log = (...args: unknown[]) => {
  logLines.push(args.join(' '));
};

try {
  await import('../../src/cli/kernel-daemon.js');
} finally {
  process.argv = origArgv;
  console.log = origLog;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

void test('kernel-daemon starts the kernel process', () => {
  assert.ok(kernelStarted, 'kernel.start() should have been called');
});

void test('kernel-daemon passes socket path to KernelProcess', () => {
  assert.equal(capturedOptions.socketPath, '/tmp/test-daemon.sock');
});

void test('kernel-daemon parses and passes http port to KernelProcess', () => {
  assert.equal(capturedOptions.httpPort, 9998);
});

void test('kernel-daemon passes pid file to KernelProcess', () => {
  assert.equal(capturedOptions.pidFile, '/tmp/test-daemon.pid');
});

void test('kernel-daemon logs startup message with PID', () => {
  assert.ok(
    logLines.some((l) => l.includes('[kernel-daemon] started')),
    'should log startup message',
  );
});
