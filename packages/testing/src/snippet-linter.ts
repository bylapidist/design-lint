import { Linter, TokenRegistry } from '@lapidist/design-lint';
import type {
  RuleModule,
  LintMessage,
  LintDocument,
  LintResult,
  DtifFlattenedToken,
} from '@lapidist/design-lint';

/** Minimal enabled-rule shape (mirrors the internal RuleRegistry return type). */
interface EnabledRule {
  rule: RuleModule;
  options: unknown;
  severity: 'error' | 'warn';
}

/** Stub DocumentSource — never actually scanned; only lintDocument is used. */
const stubSource = {
  scan: async () => ({ documents: [], ignoreFiles: [] }),
};

/**
 * A stripped-down `Linter` subclass used internally by `RuleTester`.
 *
 * Overrides `buildRuleContexts` to inject a single rule under test, bypassing
 * the `RuleRegistry` entirely. This allows testing rules that are not in the
 * built-in rule set.
 *
 * Optionally accepts a list of {@link DtifFlattenedToken}s to inject into the
 * token registry, enabling `RuleTester` coverage of token-based rules that
 * need a non-empty token set to exercise their real validation logic (rather
 * than the "configure tokens" early-exit path).
 */
export class SnippetLinter extends Linter {
  readonly #injected: EnabledRule;

  constructor(
    rule: RuleModule,
    options: unknown = undefined,
    tokens: DtifFlattenedToken[] = [],
  ) {
    super({ rules: {} }, { documentSource: stubSource });
    this.#injected = { rule, options, severity: 'error' };
    if (tokens.length > 0) {
      // The base class's tokensReady promise resolves by setting this.tokenRegistry
      // from the (empty) config tokens. We chain an additional .then() here so
      // our injected registry is applied AFTER the base-class resolution, winning
      // the assignment race.
      const registry = new TokenRegistry({ default: tokens });
      this.tokensReady = this.tokensReady.then(() => {
        this.tokenRegistry = registry;
      });
    }
  }

  /**
   * Overrides the base `buildRuleContexts` to always use the injected rule
   * instead of whatever the registry resolves.
   */
  protected override buildRuleContexts(
    _enabled: EnabledRule[],
    sourceId: string,
    metadata?: Record<string, unknown>,
  ): ReturnType<Linter['buildRuleContexts']> {
    return super.buildRuleContexts([this.#injected], sourceId, metadata);
  }

  /**
   * Lints a code snippet and returns the diagnostics produced by the injected rule.
   *
   * @param code - Source code to lint.
   * @param ext - File extension used to select the correct parser (e.g. `"css"`, `"tsx"`).
   */
  async lintSnippet(code: string, ext: string): Promise<LintMessage[]> {
    const doc: LintDocument = {
      id: `snippet.${ext}`,
      type: ext,
      getText: async () => code,
    };
    const result: LintResult = await this.lintDocument(doc);
    return result.messages;
  }
}
