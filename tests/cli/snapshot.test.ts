/**
 * Tests for the `design-lint export-runtime-snapshot` command.
 *
 * Passes stub transport constructors directly — no module mocking needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportRuntimeSnapshot } from '../../src/cli/snapshot.js';

// ---------------------------------------------------------------------------
// Stub transports
// ---------------------------------------------------------------------------

interface StubFrame {
  type: string;
  id: string;
  method?: string;
  payload?: unknown;
}

class StubUnixClient {
  readonly connected: boolean = false;

  connect(): Promise<void> {
    return Promise.resolve();
  }

  request(): Promise<StubFrame> {
    return Promise.resolve({
      type: 'response',
      id: 'r1',
      payload: 'sha256-unix',
    });
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

class FailingUnixClient {
  connect(): Promise<void> {
    return Promise.reject(new Error('ENOENT'));
  }

  request(): Promise<StubFrame> {
    return Promise.resolve({ type: 'response', id: 'r1', payload: '' });
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

class StubHttpClient {
  connect(): Promise<void> {
    return Promise.resolve();
  }

  request(): Promise<StubFrame> {
    return Promise.resolve({
      type: 'response',
      id: 'r2',
      payload: 'sha256-http',
    });
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// Helper
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

function outPath(): string {
  return join(tmpdir(), `snap-test-${Date.now().toString()}.bin`);
}

// ---------------------------------------------------------------------------
// Unix socket path
// ---------------------------------------------------------------------------

void test('exportRuntimeSnapshot exports via Unix socket', async () => {
  const lines = await captureLog(() =>
    exportRuntimeSnapshot(
      { out: outPath() },
      { UnixSocketClient: StubUnixClient, HttpClient: StubHttpClient },
    ),
  );
  assert.ok(lines.some((l) => l.includes('Snapshot exported')));
  assert.ok(lines.some((l) => l.includes('sha256-unix')));
});

// ---------------------------------------------------------------------------
// HTTP fallback path
// ---------------------------------------------------------------------------

void test('exportRuntimeSnapshot falls back to HTTP when Unix socket fails', async () => {
  const lines = await captureLog(() =>
    exportRuntimeSnapshot(
      { out: outPath(), httpPort: 9991 },
      { UnixSocketClient: FailingUnixClient, HttpClient: StubHttpClient },
    ),
  );
  assert.ok(lines.some((l) => l.includes('Snapshot exported')));
  assert.ok(lines.some((l) => l.includes('sha256-http')));
});

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------

void test('exportRuntimeSnapshot uses default out path when none provided', async () => {
  const lines = await captureLog(() =>
    exportRuntimeSnapshot(
      {},
      { UnixSocketClient: StubUnixClient, HttpClient: StubHttpClient },
    ),
  );
  assert.ok(lines.some((l) => l.includes('Snapshot exported')));
});

// ---------------------------------------------------------------------------
// Custom socket path
// ---------------------------------------------------------------------------

void test('exportRuntimeSnapshot accepts custom socket path', async () => {
  const lines = await captureLog(() =>
    exportRuntimeSnapshot(
      { out: outPath(), socketPath: '/tmp/custom.sock' },
      { UnixSocketClient: StubUnixClient, HttpClient: StubHttpClient },
    ),
  );
  assert.ok(lines.some((l) => l.includes('Snapshot exported')));
});
