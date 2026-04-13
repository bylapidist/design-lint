/**
 * Tests for the `design-lint diff` command.
 *
 * Mocks @lapidist/dsr's readSnapshot so no real kernel or snapshot file
 * is needed.
 */
import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Snapshot stubs
// ---------------------------------------------------------------------------

interface StubToken {
  type?: string;
  value?: unknown;
}

interface StubState {
  tokenGraph: {
    tokens: Map<string, StubToken>;
  };
  ruleRegistry: {
    rules: Map<string, unknown>;
  };
  componentRegistry: {
    components: Map<string, unknown>;
  };
  entropyState: {
    current: {
      overall: number;
    };
  };
}

function makeState(overrides?: Partial<StubState>): StubState {
  return {
    tokenGraph: { tokens: new Map() },
    ruleRegistry: { rules: new Map() },
    componentRegistry: { components: new Map() },
    entropyState: { current: { overall: 80 } },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Configurable mock — update readSnapshotImpl between tests
// ---------------------------------------------------------------------------

let readSnapshotImpl: () => Promise<{ state: StubState; hash: string }> = () =>
  Promise.resolve({ state: makeState(), hash: 'abc123' });

mock.module('@lapidist/dsr', {
  namedExports: {
    readSnapshot: (): Promise<{ state: StubState; hash: string }> =>
      readSnapshotImpl(),
  },
});

// Import after mock is registered
const { diffSnapshots } = await import('../../src/cli/diff.js');

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
// No differences
// ---------------------------------------------------------------------------

void test('diffSnapshots reports no differences when snapshots are identical', async () => {
  readSnapshotImpl = () =>
    Promise.resolve({ state: makeState(), hash: 'abc123' });

  const lines = await captureLog(() =>
    diffSnapshots({ snapshotA: 'a.bin', snapshotB: 'b.bin' }),
  );
  assert.ok(lines.some((l) => l.includes('No differences found')));
});

// ---------------------------------------------------------------------------
// Tokens added / removed
// ---------------------------------------------------------------------------

void test('diffSnapshots reports added tokens', async () => {
  let call = 0;
  readSnapshotImpl = (): Promise<{ state: StubState; hash: string }> => {
    call += 1;
    if (call === 1) {
      return Promise.resolve({ state: makeState(), hash: 'hashA' });
    }
    return Promise.resolve({
      state: makeState({
        tokenGraph: {
          tokens: new Map([['#/color/new', { type: 'color', value: '#fff' }]]),
        },
      }),
      hash: 'hashB',
    });
  };

  const lines = await captureLog(() =>
    diffSnapshots({ snapshotA: 'a.bin', snapshotB: 'b.bin' }),
  );
  assert.ok(
    lines.some((l) => l.includes('added') || l.includes('#/color/new')),
  );
});

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------

void test('diffSnapshots outputs valid JSON when format is json', async () => {
  readSnapshotImpl = () => Promise.resolve({ state: makeState(), hash: 'h1' });

  const jsonLines: string[] = [];
  const origLog = console.log;
  console.log = (v: unknown) => {
    jsonLines.push(String(v));
  };
  try {
    await diffSnapshots({
      snapshotA: 'a.bin',
      snapshotB: 'b.bin',
      format: 'json',
    });
  } finally {
    console.log = origLog;
  }
  const combined = jsonLines.join('');
  const parsed = JSON.parse(combined) as { snapshotHashA: string };
  assert.equal(parsed.snapshotHashA, 'h1');
});

// ---------------------------------------------------------------------------
// Entropy delta
// ---------------------------------------------------------------------------

void test('diffSnapshots reports entropy delta when scores differ', async () => {
  let call2 = 0;
  readSnapshotImpl = (): Promise<{ state: StubState; hash: string }> => {
    call2 += 1;
    return Promise.resolve({
      state: makeState({
        entropyState: { current: { overall: call2 === 1 ? 70 : 90 } },
      }),
      hash: `h${call2.toString()}`,
    });
  };

  const lines = await captureLog(() =>
    diffSnapshots({ snapshotA: 'a.bin', snapshotB: 'b.bin' }),
  );
  assert.ok(
    lines.some(
      (l) =>
        l.includes('Entropy delta') ||
        l.includes('improved') ||
        l.includes('degraded'),
    ),
  );
});
