/**
 * RDK file watcher — watches a rule module file and re-runs tests on change.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runTests } from './runner.js';
import type { RdkDevOptions, RdkRunResult, RdkFixture } from './types.js';

type OnResultCallback = (result: RdkRunResult) => void;

/**
 * Resolves and imports a fixture file.
 * Expects the module to export a default {@link RdkFixture}.
 */
interface FixtureModule {
  default?: RdkFixture;
}

function isFixtureModule(val: unknown): val is FixtureModule {
  return typeof val === 'object' && val !== null;
}

async function loadFixture(fixturePath: string): Promise<RdkFixture> {
  // Use a cache-busting query string so Node re-evaluates on change.
  const ts = Date.now().toString();
  const url = `${pathToFileURL(path.resolve(fixturePath)).href}?t=${ts}`;
  const mod: unknown = await import(url);
  if (!isFixtureModule(mod) || !mod.default) {
    throw new Error(
      `Fixture at ${fixturePath} must have a default export of type RdkFixture`,
    );
  }
  return mod.default;
}

/**
 * Starts a file watcher that re-runs tests on every change.
 *
 * @param options - {@link RdkDevOptions} controlling which files to watch.
 * @param onResult - Callback invoked with the test result after each run.
 * @returns A cleanup function that stops the watcher.
 */
export function watchRule(
  options: RdkDevOptions,
  onResult: OnResultCallback,
): () => void {
  const { rulePath, fixturesDir } = options;

  const watchPaths: string[] = [rulePath];
  if (fixturesDir) {
    watchPaths.push(fixturesDir);
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const runOnce = async (): Promise<void> => {
    try {
      const fixturePath = fixturesDir
        ? path.join(fixturesDir, path.basename(rulePath, '.ts') + '.fixture.ts')
        : rulePath;

      const fixture = await loadFixture(fixturePath);
      const result = await runTests(
        fixture.ruleName,
        fixture.rule,
        fixture.tests,
      );
      onResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      onResult({
        passed: false,
        total: 0,
        passing: 0,
        failing: 1,
        durationMs: 0,
        errors: [message],
      });
    }
  };

  const debounced = (): void => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void runOnce();
    }, 150);
  };

  // Initial run
  void runOnce();

  const watchers = watchPaths.map((p) =>
    fs.watch(p, { recursive: true }, debounced),
  );

  return () => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    for (const watcher of watchers) watcher.close();
  };
}
