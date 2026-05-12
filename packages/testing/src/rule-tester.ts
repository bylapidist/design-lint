import type { LintMessage, RuleModule, DtifFlattenedToken } from '@lapidist/design-lint';
import assert from 'node:assert/strict';
import { SnippetLinter } from './snippet-linter.js';

/** A file type accepted by the linter. */
export type FileType = 'css' | 'ts' | 'tsx' | 'vue' | 'svelte';

/** A valid (no-violation) test case. */
export interface ValidCase {
  /** Source code snippet to lint. */
  code: string;
  /** The file type to lint as. */
  fileType: FileType;
  /** Optional rule-specific options. */
  options?: unknown;
  /**
   * Flattened DTIF tokens to inject into the linter for this case.
   * Required when testing token-based rules that need a non-empty token set
   * to exercise real validation (rather than the "configure tokens" message).
   */
  tokens?: DtifFlattenedToken[];
}

/** An expected diagnostic produced by an invalid case. */
export interface ExpectedError {
  /** The rule id that produced this diagnostic (e.g. `design-token/colors`). */
  ruleId?: string;
  /** Substring that the diagnostic message must contain. */
  message?: string;
  /** Expected 1-based source line. */
  line?: number;
  /** Expected 1-based source column. */
  column?: number;
}

/** An invalid (must-produce-violations) test case. */
export interface InvalidCase {
  /** Source code snippet to lint. */
  code: string;
  /** The file type to lint as. */
  fileType: FileType;
  /** Optional rule-specific options. */
  options?: unknown;
  /**
   * Flattened DTIF tokens to inject into the linter for this case.
   * Required when testing token-based rules that need a non-empty token set
   * to exercise real validation (rather than the "configure tokens" message).
   */
  tokens?: DtifFlattenedToken[];
  /** The diagnostics that must be reported — at least one required. */
  errors: [ExpectedError, ...ExpectedError[]];
  /** Expected auto-fixed output, if the rule is fixable. */
  output?: string;
}

/** Top-level test collection passed to {@link RuleTester.run}. */
export interface RuleTesterTests {
  valid: ValidCase[];
  invalid: InvalidCase[];
}

/** Construction options for {@link RuleTester}. */
export interface RuleTesterConfig {
  /** Default file type to use when a case does not specify one. */
  defaultFileType?: FileType;
}

/**
 * Utility for testing individual `@lapidist/design-lint` rules.
 *
 * Mirrors the ESLint `RuleTester` API so rule authors have a familiar
 * testing surface. Each `invalid` case must produce at least the number of
 * diagnostics listed in `errors`; each `valid` case must produce none.
 *
 * @example
 * ```ts
 * const tester = new RuleTester({ defaultFileType: 'css' });
 * await tester.run('design-token/colors', colorsRule, {
 *   valid: [{ code: 'a { color: var(--color-brand-primary); }', fileType: 'css' }],
 *   invalid: [{ code: 'a { color: #3B82F6; }', fileType: 'css', errors: [{ ruleId: 'design-token/colors' }] }],
 * });
 * ```
 */
export class RuleTester {
  readonly #config: Required<RuleTesterConfig>;

  constructor(config: RuleTesterConfig = {}) {
    this.#config = {
      defaultFileType: config.defaultFileType ?? 'css',
    };
  }

  /**
   * Runs the test suite for a single rule.
   *
   * @param {string} ruleName - The rule's canonical name (e.g. `design-token/colors`).
   * @param {RuleModule} rule - The rule module under test.
   * @param {RuleTesterTests} tests - Valid and invalid test cases.
   * @returns {Promise<void>} Resolves when all assertions pass.
   */
  async run(
    ruleName: string,
    rule: RuleModule,
    tests: RuleTesterTests,
  ): Promise<void> {
    for (const testCase of tests.valid) {
      const fileType = testCase.fileType ?? this.#config.defaultFileType;
      const diagnostics = await this.#lint(
        rule,
        testCase.code,
        fileType,
        testCase.options,
        testCase.tokens,
      );
      assert.equal(
        diagnostics.length,
        0,
        `Rule "${ruleName}" reported unexpected diagnostics for valid case:\n${testCase.code}\n\nDiagnostics:\n${JSON.stringify(diagnostics, null, 2)}`,
      );
    }

    for (const testCase of tests.invalid) {
      const fileType = testCase.fileType ?? this.#config.defaultFileType;
      const diagnostics = await this.#lint(
        rule,
        testCase.code,
        fileType,
        testCase.options,
        testCase.tokens,
      );
      assert.ok(
        diagnostics.length >= testCase.errors.length,
        `Rule "${ruleName}" expected at least ${String(testCase.errors.length)} diagnostic(s) but got ${String(diagnostics.length)}:\n${testCase.code}`,
      );

      for (let i = 0; i < testCase.errors.length; i += 1) {
        const expected = testCase.errors[i];
        const actual = diagnostics[i];
        if (expected === undefined || actual === undefined) continue;

        if (expected.ruleId !== undefined) {
          assert.equal(
            actual.ruleId,
            expected.ruleId,
            `Diagnostic ${String(i)} ruleId mismatch`,
          );
        }
        if (expected.message !== undefined) {
          assert.ok(
            actual.message.includes(expected.message),
            `Diagnostic ${String(i)} message "${actual.message}" does not include "${expected.message}"`,
          );
        }
        if (expected.line !== undefined) {
          assert.equal(
            actual.line,
            expected.line,
            `Diagnostic ${String(i)} line mismatch`,
          );
        }
        if (expected.column !== undefined) {
          assert.equal(
            actual.column,
            expected.column,
            `Diagnostic ${String(i)} column mismatch`,
          );
        }
      }
    }
  }

  /**
   * Runs the linter against a code snippet using a `SnippetLinter` that
   * injects the rule under test directly, bypassing the rule registry.
   *
   * @param {RuleModule} rule - The rule module to test.
   * @param {string} code - Source code to lint.
   * @param {FileType} fileType - The file type to lint as.
   * @param {unknown} options - Rule-specific options.
   * @returns {Promise<LintMessage[]>} Diagnostics produced by the rule.
   */
  async #lint(
    rule: RuleModule,
    code: string,
    fileType: FileType,
    options?: unknown,
    tokens?: DtifFlattenedToken[],
  ): Promise<LintMessage[]> {
    const linter = new SnippetLinter(rule, options, tokens);
    return linter.lintSnippet(code, fileType);
  }
}
