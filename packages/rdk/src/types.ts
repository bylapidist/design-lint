import type { RuleModule } from '@lapidist/design-lint';
import type { RuleTesterTests } from '@lapidist/design-lint-testing';

/** Options for the RDK dev server. */
export interface RdkDevOptions {
  /** Path to the rule module file to watch. */
  rulePath: string;
  /** Path to the fixtures directory containing RuleTesterTests. */
  fixturesDir?: string;
  /** Port for the optional web UI (disabled when not set). */
  port?: number;
}

/** Summary of a single RDK test run. */
export interface RdkRunResult {
  /** Whether all test cases passed. */
  passed: boolean;
  /** Total number of test cases. */
  total: number;
  /** Number of passing test cases. */
  passing: number;
  /** Number of failing test cases. */
  failing: number;
  /** Duration of the run in milliseconds. */
  durationMs: number;
  /** Error messages for each failing case. */
  errors: string[];
}

/** A fixture file exporting a RuleTesterTests object. */
export interface RdkFixture {
  ruleName: string;
  rule: RuleModule;
  tests: RuleTesterTests;
}
