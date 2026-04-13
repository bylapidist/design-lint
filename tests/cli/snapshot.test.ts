/**
 * Tests for the `design-lint export-runtime-snapshot` command.
 *
 * Mocks @lapidist/dsr's UnixSocketClient and HttpClient so no real kernel
 * connection is needed.
 */
import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Configurable mock transport state
// ---------------------------------------------------------------------------

let unixShouldFail = false;

interface MockResponse {
  type: string;
  payload: unknown;
}

class MockUnixSocketClient {
  connect(): Promise<void> {
    if (unixShouldFail) return Promise.reject(new Error('ENOENT'));
    return Promise.resolve();
  }

  request(): Promise<MockResponse> {
    return Promise.resolve({ type: 'response', payload: 'sha256-unix' });
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

class MockHttpClient {
  connect(): Promise<void> {
    return Promise.resolve();
  }

  request(): Promise<MockResponse> {
    return Promise.resolve({ type: 'response', payload: 'sha256-http' });
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

mock.module('@lapidist/dsr', {
  namedExports: {
    UnixSocketClient: MockUnixSocketClient,
    HttpClient: MockHttpClient,
  },
});

// Import after mock is registered
const { exportRuntimeSnapshot } = await import('../../src/cli/snapshot.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function outPath(): string {
  return join(tmpdir(), `snap-test-${Date.now().toString()}.bin`);
}

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
// Unix socket happy path
// ---------------------------------------------------------------------------

void test('exportRuntimeSnapshot succeeds via Unix socket', async () => {
  unixShouldFail = false;
  const lines = await captureLog(() =>
    exportRuntimeSnapshot({ out: outPath() }),
  );
  assert.ok(lines.some((l) => l.includes('Snapshot exported')));
  assert.ok(lines.some((l) => l.includes('sha256-unix')));
});

// ---------------------------------------------------------------------------
// HTTP fallback path
// ---------------------------------------------------------------------------

void test('exportRuntimeSnapshot falls back to HTTP when Unix socket fails', async () => {
  unixShouldFail = true;
  const lines = await captureLog(() =>
    exportRuntimeSnapshot({ out: outPath(), httpPort: 9991 }),
  );
  unixShouldFail = false;
  assert.ok(lines.some((l) => l.includes('Snapshot exported')));
  assert.ok(lines.some((l) => l.includes('sha256-http')));
});

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------

void test('exportRuntimeSnapshot uses default out path when none provided', async () => {
  unixShouldFail = false;
  const lines = await captureLog(() => exportRuntimeSnapshot({}));
  assert.ok(lines.some((l) => l.includes('Snapshot exported')));
});
