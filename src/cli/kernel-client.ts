/**
 * Optional DSR kernel connection helper for CLI commands.
 *
 * Commands that can be enriched with live kernel state — snapshot hash,
 * component registry, deprecation ledger — call `tryFetchKernelData()`.
 * If the kernel is not running the function returns `null` and callers fall
 * back to local/config-based defaults. No error is ever thrown to the caller.
 */
import { createHash } from 'node:crypto';
import type { NodeEnvironment } from '@lapidist/dsr/environments/node';
import type { ComponentInput, DeprecationEntryInput } from '@lapidist/dscp';

export interface KernelData {
  /** Deterministic SHA-256 hash of the token graph, computed from sorted pointers. */
  snapshotHash: string;
  /** All tokens from the kernel token graph, keyed by pointer. */
  tokenEntries: Map<string, { pointer: string; name: string; type?: string }>;
  /** Deprecation ledger entries keyed by token pointer. */
  deprecationEntries: Map<string, DeprecationEntryInput>;
  /** Component registry entries keyed by component name. */
  componentEntries: Map<string, ComponentInput>;
}

/**
 * Attempt to connect to the running DSR kernel and fetch data needed for
 * DSCP document and docs generation. Returns `null` if the kernel is not
 * reachable within a 2-second timeout.
 *
 * Always disconnects before returning, even on error.
 */
export async function tryFetchKernelData(): Promise<KernelData | null> {
  let env: NodeEnvironment | null = null;
  try {
    const { NodeEnvironment: Env } =
      await import('@lapidist/dsr/environments/node');
    env = new Env({ connectTimeoutMs: 2_000 });
    await env.connect();

    // forProperty('') returns all non-deprecated tokens (empty string maps to no
    // specific types, so the executor falls back to the full token set)
    const allTokens = await env.dsql.tokens().forProperty('');
    const deprecatedTokens = await env.dsql.tokens().deprecated();
    const allComponents = await env.dsql.components().all();

    const snapshotHash = computeHash(allTokens.map((t) => t.pointer));

    const tokenEntries = new Map<
      string,
      { pointer: string; name: string; type?: string }
    >(
      allTokens.map((t) => [
        t.pointer,
        { pointer: t.pointer, name: t.name, type: t.type },
      ]),
    );

    const deprecationEntries = new Map<string, DeprecationEntryInput>(
      deprecatedTokens.map((dt) => [
        dt.entry.pointer,
        {
          pointer: dt.entry.pointer,
          replacement: dt.entry.replacement,
          since: dt.entry.since,
          reason: dt.entry.reason,
        },
      ]),
    );

    const componentEntries = new Map<string, ComponentInput>(
      allComponents.map((comp) => [
        comp.name,
        {
          name: comp.name,
          package: comp.package,
          version: comp.version,
          deprecated: comp.deprecated,
          replacedBy: comp.replacedBy,
        },
      ]),
    );

    return { snapshotHash, tokenEntries, deprecationEntries, componentEntries };
  } catch {
    return null;
  } finally {
    if (env !== null) {
      await env.disconnect().catch(() => undefined);
    }
  }
}

function computeHash(pointers: string[]): string {
  const sorted = [...pointers].sort();
  return createHash('sha256')
    .update(sorted.join('\n'))
    .digest('hex')
    .slice(0, 16);
}
