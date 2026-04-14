/**
 * `design-lint diff` command implementation.
 *
 * Compares two DSR kernel snapshots and reports the differences:
 *   - Tokens added / removed / changed
 *   - Rules reconfigured
 *   - Components added / removed
 *   - Entropy delta
 *
 * Usage:
 *   design-lint diff <snapshot-a> <snapshot-b>
 */
import path from 'node:path';

interface DiffOptions {
  /** First snapshot path (the "before" state). */
  snapshotA: string;
  /** Second snapshot path (the "after" state). */
  snapshotB: string;
  /** Output format: 'text' (default) or 'json'. */
  format?: 'text' | 'json';
}

interface DiffResult {
  tokensAdded: string[];
  tokensRemoved: string[];
  tokensChanged: string[];
  rulesChanged: string[];
  componentsAdded: string[];
  componentsRemoved: string[];
  entropyDelta: number;
  snapshotHashA: string;
  snapshotHashB: string;
}

/**
 * Minimal subset of KernelState used by this command.
 * The actual KernelState (from @lapidist/dsr) is a structural superset.
 */
interface SnapshotState {
  tokenGraph: { tokens: ReadonlyMap<string, unknown> };
  ruleRegistry: { rules: ReadonlyMap<string, unknown> };
  componentRegistry: { components: ReadonlyMap<string, unknown> };
  entropyState: { current: { overall: number } };
}

export type ReadSnapshotFn = (
  filePath: string,
) => Promise<{ state: SnapshotState; hash: string }>;

async function loadDefaultReader(): Promise<ReadSnapshotFn> {
  const { readSnapshot } = await import('@lapidist/dsr');
  return readSnapshot;
}

/**
 * Compare two DSR binary snapshots and print the diff to stdout.
 *
 * @param options - Diff command options.
 * @param readSnapshot - Optional override for reading snapshots (used in tests).
 */
export async function diffSnapshots(
  options: DiffOptions,
  readSnapshot?: ReadSnapshotFn,
): Promise<void> {
  const pathA = path.resolve(process.cwd(), options.snapshotA);
  const pathB = path.resolve(process.cwd(), options.snapshotB);

  const reader = readSnapshot ?? (await loadDefaultReader());

  const [{ state: stateA, hash: hashA }, { state: stateB, hash: hashB }] =
    await Promise.all([reader(pathA), reader(pathB)]);

  const tokensA = new Set(stateA.tokenGraph.tokens.keys());
  const tokensB = new Set(stateB.tokenGraph.tokens.keys());

  const tokensAdded = [...tokensB].filter((p) => !tokensA.has(p));
  const tokensRemoved = [...tokensA].filter((p) => !tokensB.has(p));
  const tokensChanged = [...tokensA]
    .filter((p) => tokensB.has(p))
    .filter((p) => {
      const ta = stateA.tokenGraph.tokens.get(p);
      const tb = stateB.tokenGraph.tokens.get(p);
      return JSON.stringify(ta) !== JSON.stringify(tb);
    });

  const rulesA = new Set(stateA.ruleRegistry.rules.keys());
  const rulesB = new Set(stateB.ruleRegistry.rules.keys());
  const rulesChanged = [
    ...[...rulesA].filter((id) => {
      const ra = stateA.ruleRegistry.rules.get(id);
      const rb = stateB.ruleRegistry.rules.get(id);
      return JSON.stringify(ra) !== JSON.stringify(rb);
    }),
    ...[...rulesB].filter((id) => !rulesA.has(id)),
  ];

  const componentsA = new Set(stateA.componentRegistry.components.keys());
  const componentsB = new Set(stateB.componentRegistry.components.keys());
  const componentsAdded = [...componentsB].filter((n) => !componentsA.has(n));
  const componentsRemoved = [...componentsA].filter((n) => !componentsB.has(n));

  const entropyDelta =
    stateB.entropyState.current.overall - stateA.entropyState.current.overall;

  const result: DiffResult = {
    tokensAdded,
    tokensRemoved,
    tokensChanged,
    rulesChanged,
    componentsAdded,
    componentsRemoved,
    entropyDelta,
    snapshotHashA: hashA,
    snapshotHashB: hashB,
  };

  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Text format
  console.log(`Diff: ${path.basename(pathA)} → ${path.basename(pathB)}`);
  console.log(`  Hash A: ${hashA}`);
  console.log(`  Hash B: ${hashB}`);
  console.log('');

  const noDiffs =
    tokensAdded.length === 0 &&
    tokensRemoved.length === 0 &&
    tokensChanged.length === 0 &&
    rulesChanged.length === 0 &&
    componentsAdded.length === 0 &&
    componentsRemoved.length === 0 &&
    entropyDelta === 0;

  if (noDiffs) {
    console.log('No differences found.');
    return;
  }

  if (tokensAdded.length > 0) {
    console.log(`Tokens added (${tokensAdded.length.toString()}):`);
    for (const p of tokensAdded) console.log(`  + ${p}`);
  }
  if (tokensRemoved.length > 0) {
    console.log(`Tokens removed (${tokensRemoved.length.toString()}):`);
    for (const p of tokensRemoved) console.log(`  - ${p}`);
  }
  if (tokensChanged.length > 0) {
    console.log(`Tokens changed (${tokensChanged.length.toString()}):`);
    for (const p of tokensChanged) console.log(`  ~ ${p}`);
  }
  if (rulesChanged.length > 0) {
    console.log(`Rules changed (${rulesChanged.length.toString()}):`);
    for (const id of rulesChanged) console.log(`  ~ ${id}`);
  }
  if (componentsAdded.length > 0) {
    console.log(`Components added (${componentsAdded.length.toString()}):`);
    for (const n of componentsAdded) console.log(`  + ${n}`);
  }
  if (componentsRemoved.length > 0) {
    console.log(`Components removed (${componentsRemoved.length.toString()}):`);
    for (const n of componentsRemoved) console.log(`  - ${n}`);
  }
  if (entropyDelta !== 0) {
    const sign = entropyDelta > 0 ? '+' : '';
    console.log(
      `Entropy delta: ${sign}${entropyDelta.toFixed(1)} (${entropyDelta > 0 ? 'improved' : 'degraded'})`,
    );
  }
}
