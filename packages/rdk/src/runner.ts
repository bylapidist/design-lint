/**
 * RDK runner — executes RuleTesterTests through the RuleTester and returns a
 * summary RdkRunResult.
 */
import { RuleTester } from '@lapidist/design-lint-testing';
import type { RuleModule } from '@lapidist/design-lint';
import type { RuleTesterTests } from '@lapidist/design-lint-testing';
import type { RdkRunResult } from './types.js';

/**
 * Runs a rule's test suite and returns a structured result.
 *
 * @param ruleName - The rule identifier used in assertion messages.
 * @param rule - The rule module under test.
 * @param tests - Valid and invalid test cases.
 * @returns A {@link RdkRunResult} summarising the run.
 */
export async function runTests(
  ruleName: string,
  rule: RuleModule,
  tests: RuleTesterTests,
): Promise<RdkRunResult> {
  const startMs = Date.now();
  const errors: string[] = [];

  const tester = new RuleTester();

  try {
    await tester.run(ruleName, rule, tests);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
  }

  const durationMs = Date.now() - startMs;
  const total = tests.valid.length + tests.invalid.length;
  const failing = errors.length;
  const passing = total - failing;

  return {
    passed: failing === 0,
    total,
    passing,
    failing,
    durationMs,
    errors,
  };
}
