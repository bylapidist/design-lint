/**
 * Tests for the `design-lint diff` command.
 *
 * Passes a stub readSnapshot function directly — no module mocking needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { diffSnapshots } from '../../src/cli/diff.js';

// ---------------------------------------------------------------------------
// Stub state factory
// ---------------------------------------------------------------------------

interface StubToken {
  type?: string;
  value?: unknown;
}

interface StubState {
  tokenGraph: { tokens: Map<string, StubToken> };
  ruleRegistry: { rules: Map<string, unknown> };
  componentRegistry: { components: Map<string, unknown> };
  entropyState: { current: { overall: number } };
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

// Stub readSnapshot that returns the same state for both calls
function makeReader(
  stateA: StubState,
  stateB: StubState,
  hashA = 'hashA',
  hashB = 'hashB',
) {
  let call = 0;
  return (): Promise<{ state: StubState; hash: string }> => {
    call += 1;
    return Promise.resolve(
      call === 1
        ? { state: stateA, hash: hashA }
        : { state: stateB, hash: hashB },
    );
  };
}

// ---------------------------------------------------------------------------
// No differences
// ---------------------------------------------------------------------------

void test('diffSnapshots reports no differences when snapshots are identical', async () => {
  const state = makeState();
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(state, state),
    ),
  );
  assert.ok(lines.some((l) => l.includes('No differences found')));
});

// ---------------------------------------------------------------------------
// Tokens added
// ---------------------------------------------------------------------------

void test('diffSnapshots reports added tokens', async () => {
  const stateA = makeState();
  const stateB = makeState({
    tokenGraph: {
      tokens: new Map([['#/color/new', { type: 'color', value: '#fff' }]]),
    },
  });
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(stateA, stateB),
    ),
  );
  assert.ok(
    lines.some((l) => l.includes('added') || l.includes('#/color/new')),
  );
});

// ---------------------------------------------------------------------------
// Tokens removed
// ---------------------------------------------------------------------------

void test('diffSnapshots reports removed tokens', async () => {
  const stateA = makeState({
    tokenGraph: {
      tokens: new Map([['#/color/old', { type: 'color', value: '#000' }]]),
    },
  });
  const stateB = makeState();
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(stateA, stateB),
    ),
  );
  assert.ok(
    lines.some((l) => l.includes('removed') || l.includes('#/color/old')),
  );
});

// ---------------------------------------------------------------------------
// Tokens changed
// ---------------------------------------------------------------------------

void test('diffSnapshots reports changed tokens', async () => {
  const stateA = makeState({
    tokenGraph: {
      tokens: new Map([['#/color/brand', { type: 'color', value: '#000' }]]),
    },
  });
  const stateB = makeState({
    tokenGraph: {
      tokens: new Map([['#/color/brand', { type: 'color', value: '#fff' }]]),
    },
  });
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(stateA, stateB),
    ),
  );
  assert.ok(
    lines.some((l) => l.includes('changed') || l.includes('#/color/brand')),
  );
});

// ---------------------------------------------------------------------------
// Rules changed
// ---------------------------------------------------------------------------

void test('diffSnapshots reports changed rules', async () => {
  const stateA = makeState({
    ruleRegistry: {
      rules: new Map([['design-token/colors', { severity: 'warn' }]]),
    },
  });
  const stateB = makeState({
    ruleRegistry: {
      rules: new Map([['design-token/colors', { severity: 'error' }]]),
    },
  });
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(stateA, stateB),
    ),
  );
  assert.ok(
    lines.some((l) => l.includes('Rules') || l.includes('design-token/colors')),
  );
});

// ---------------------------------------------------------------------------
// Components added / removed
// ---------------------------------------------------------------------------

void test('diffSnapshots reports added components', async () => {
  const stateA = makeState();
  const stateB = makeState({
    componentRegistry: {
      components: new Map([['Button', { package: '@acme/ui' }]]),
    },
  });
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(stateA, stateB),
    ),
  );
  assert.ok(lines.some((l) => l.includes('Component') || l.includes('Button')));
});

void test('diffSnapshots reports removed components', async () => {
  const stateA = makeState({
    componentRegistry: {
      components: new Map([['Button', { package: '@acme/ui' }]]),
    },
  });
  const stateB = makeState();
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(stateA, stateB),
    ),
  );
  assert.ok(lines.some((l) => l.includes('removed') || l.includes('Button')));
});

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------

void test('diffSnapshots outputs valid JSON when format is json', async () => {
  const state = makeState();
  const jsonLines: string[] = [];
  const origLog = console.log;
  console.log = (v: unknown) => {
    jsonLines.push(String(v));
  };
  try {
    await diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin', format: 'json' },
      makeReader(state, state, 'h1', 'h2'),
    );
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
  const stateA = makeState({ entropyState: { current: { overall: 70 } } });
  const stateB = makeState({ entropyState: { current: { overall: 90 } } });
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(stateA, stateB),
    ),
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

void test('diffSnapshots reports entropy degradation', async () => {
  const stateA = makeState({ entropyState: { current: { overall: 90 } } });
  const stateB = makeState({ entropyState: { current: { overall: 70 } } });
  const lines = await captureLog(() =>
    diffSnapshots(
      { snapshotA: 'a.bin', snapshotB: 'b.bin' },
      makeReader(stateA, stateB),
    ),
  );
  assert.ok(lines.some((l) => l.includes('degraded')));
});
