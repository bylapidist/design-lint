/**
 * @packageDocumentation
 *
 * Enforces a `DesignLintPolicy` against a resolved `Config` and/or lint results.
 *
 * Static enforcement (`enforcePolicy`) checks rule configuration and raises
 * a `ConfigError` before any linting begins.
 *
 * Runtime enforcement (`enforceRuntimePolicy`) runs after a lint pass
 * completes and validates token coverage, ratchet, and agent policy
 * constraints against the actual results.
 */
import type { Config } from '../core/linter.js';
import type { DesignLintPolicy, LintResult } from '../core/types.js';
import { ConfigError } from '../core/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = { off: 0, warn: 1, error: 2 };

/**
 * Normalises a rule setting to a severity string.
 * Accepts `'error'`, `'warn'`, `'off'`, `2`, `1`, `0`, or a tuple
 * `['error', options]`.
 */
function toSeverity(setting: unknown): string {
  if (typeof setting === 'string') return setting;
  if (setting === 2) return 'error';
  if (setting === 1) return 'warn';
  if (setting === 0) return 'off';
  if (Array.isArray(setting) && setting.length > 0)
    return toSeverity(setting[0]);
  return 'off';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Rule-ID to token type mapping (used for tokenCoverage enforcement)
// ---------------------------------------------------------------------------

/**
 * Maps a rule ID to its DTIF token type string, when the rule is a
 * token-category rule. Unrecognised rule IDs return `undefined`.
 */
function tokenTypeFromRuleId(ruleId: string): string | undefined {
  const TOKEN_RULE_MAP: Record<string, string> = {
    'design-token/colors': 'color',
    'design-token/border-color': 'color',
    'design-token/font-size': 'fontSize',
    'design-token/font-family': 'fontFamily',
    'design-token/font-weight': 'fontWeight',
    'design-token/letter-spacing': 'letterSpacing',
    'design-token/line-height': 'lineHeight',
    'design-token/spacing': 'dimension',
    'design-token/border-radius': 'dimension',
    'design-token/border-width': 'dimension',
    'design-token/box-shadow': 'shadow',
    'design-token/outline': 'border',
    'design-token/opacity': 'number',
    'design-token/duration': 'duration',
    'design-token/easing': 'easing',
    'design-token/animation': 'duration',
    'design-token/blur': 'blur',
    'design-token/z-index': 'number',
  };
  return TOKEN_RULE_MAP[ruleId];
}

// ---------------------------------------------------------------------------
// Entropy score proxy (metric mode ratchet)
// ---------------------------------------------------------------------------

/**
 * Computes a simple 0–100 quality score from lint results.
 * Higher is better: 100 means zero violations across all files.
 *
 * Formula: `max(0, 100 - (totalViolations / max(1, fileCount)) * 10)`
 * — a violation rate of 10 per file drives the score to zero.
 */
function computeScore(results: LintResult[]): number {
  const totalViolations = results.reduce(
    (sum, r) => sum + r.messages.length,
    0,
  );
  const fileCount = results.length;
  const rate = totalViolations / Math.max(1, fileCount);
  return Math.max(0, 100 - rate * 10);
}

// ---------------------------------------------------------------------------
// Runtime policy context
// ---------------------------------------------------------------------------

/**
 * Contextual data required for runtime policy enforcement.
 */
export interface RuntimePolicyContext {
  /**
   * Known baseline violation counts for ratchet enforcement.
   * When absent, ratchet checks are skipped.
   */
  baseline?: {
    /** Total violation count from the reference run. */
    totalCount: number;
    /** Computed quality score (0–100) from the reference run. */
    score: number;
  };
  /**
   * Agent identifier for `agentPolicy.trustedAgents` evaluation.
   * When absent, the agent is treated as untrusted.
   */
  agentId?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enforces `policy` constraints against `config`.
 *
 * Checks:
 * - Every `requiredRule` is present and not `'off'`.
 * - No rule in `minSeverity` is configured below the minimum.
 *
 * @throws {ConfigError} on the first violation found.
 */
export function enforcePolicy(config: Config, policy: DesignLintPolicy): void {
  const rules = config.rules ?? {};

  // 1. Required rules must be enabled
  for (const ruleId of policy.requiredRules) {
    const setting = rules[ruleId];
    const severity = toSeverity(setting);
    if (severity === 'off' || setting === undefined) {
      throw new ConfigError({
        message: `Policy violation: rule "${ruleId}" is required but is disabled or not configured.`,
        context: `designlint.policy.json → requiredRules`,
        remediation: `Add "${ruleId}" to your rules configuration with at least "warn" severity.`,
      });
    }
  }

  // 2. minSeverity constraints must be satisfied
  for (const [ruleId, minSev] of Object.entries(policy.minSeverity)) {
    const setting = rules[ruleId];
    if (setting === undefined) continue; // rule not configured — skip
    const actual = toSeverity(setting);
    if (actual === 'off') {
      throw new ConfigError({
        message: `Policy violation: rule "${ruleId}" must have at least "${minSev}" severity but is disabled.`,
        context: `designlint.policy.json → minSeverity`,
        remediation: `Set "${ruleId}" to "${minSev}" or higher in your rules configuration.`,
      });
    }
    const minRank = SEVERITY_RANK[minSev] ?? 0;
    const actualRank = SEVERITY_RANK[actual] ?? 0;
    if (actualRank < minRank) {
      throw new ConfigError({
        message: `Policy violation: rule "${ruleId}" must have at least "${minSev}" severity but is set to "${actual}".`,
        context: `designlint.policy.json → minSeverity`,
        remediation: `Increase the severity of "${ruleId}" to at least "${minSev}".`,
      });
    }
  }
}

/**
 * Enforces runtime policy constraints against completed lint results.
 *
 * Checks (in order):
 * 1. **tokenCoverage** — when threshold is `1` (100%), any violation for
 *    that token category fails. Sub-100% thresholds require total usage
 *    counts (not currently tracked) and are skipped with no error.
 * 2. **ratchet** — metric mode: total violation count must not exceed
 *    `baseline.totalCount + (maxDelta ?? 0)`. Entropy mode: computed score
 *    must be ≥ `minScore`.
 * 3. **agentPolicy** — `requiredConvergence` fails on any error-severity
 *    message; `maxViolationRate` fails when violations-per-file exceeds the
 *    threshold; trusted agents bypass both checks.
 *
 * @throws {ConfigError} on the first runtime policy violation found.
 */
export function enforceRuntimePolicy(
  results: LintResult[],
  policy: DesignLintPolicy,
  context: RuntimePolicyContext = {},
): void {
  const allMessages = results.flatMap((r) => r.messages);
  const fileCount = results.length;

  // 1. tokenCoverage — only enforceable at 100% threshold without usage stats
  for (const [tokenType, threshold] of Object.entries(policy.tokenCoverage)) {
    if (threshold === undefined) continue;
    if (threshold < 1) continue; // sub-100% requires total usages — skip
    const violationCount = allMessages.filter((m) => {
      const mapped = tokenTypeFromRuleId(m.ruleId);
      return mapped === tokenType;
    }).length;
    if (violationCount > 0) {
      throw new ConfigError({
        message: `Policy violation: token coverage for "${tokenType}" must be 100% but ${String(violationCount)} violation${violationCount === 1 ? '' : 's'} were found.`,
        context: `designlint.policy.json → tokenCoverage`,
        remediation: `Fix all "${tokenType}" token violations or lower the coverage threshold below 1.`,
      });
    }
  }

  // 2. ratchet
  if (context.baseline !== undefined) {
    const baseline = context.baseline;
    if (policy.ratchet.mode === 'metric') {
      const totalCount = allMessages.length;
      const maxDelta = policy.ratchet.maxDelta ?? 0;
      if (totalCount > baseline.totalCount + maxDelta) {
        throw new ConfigError({
          message: `Policy violation: violation count increased from ${String(baseline.totalCount)} to ${String(totalCount)} (maxDelta: ${String(maxDelta)}).`,
          context: `designlint.policy.json → ratchet`,
          remediation: `Fix the new violations or update the baseline with the current results.`,
        });
      }
    } else {
      // entropy mode
      const minScore = policy.ratchet.minScore;
      if (minScore !== undefined) {
        const score = computeScore(results);
        if (score < minScore) {
          throw new ConfigError({
            message: `Policy violation: quality score ${score.toFixed(1)} is below the minimum ${String(minScore)} (baseline: ${baseline.score.toFixed(1)}).`,
            context: `designlint.policy.json → ratchet`,
            remediation: `Fix violations to raise the quality score above ${String(minScore)}.`,
          });
        }
      }
    }
  }

  // 3. agentPolicy
  const agentPolicy = policy.agentPolicy;
  if (agentPolicy !== undefined) {
    const agentId = context.agentId;
    if (agentId !== undefined && agentPolicy.trustedAgents.includes(agentId)) {
      return; // trusted agent — skip all agent checks
    }

    if (agentPolicy.requiredConvergence) {
      const errorCount = allMessages.filter(
        (m) => m.severity === 'error',
      ).length;
      if (errorCount > 0) {
        throw new ConfigError({
          message: `Policy violation: agent session must converge to zero errors but ${String(errorCount)} error${errorCount === 1 ? '' : 's'} remain.`,
          context: `designlint.policy.json → agentPolicy.requiredConvergence`,
          remediation: `Fix all error-severity violations before completing the agent session.`,
        });
      }
    }

    const violationRate = allMessages.length / Math.max(1, fileCount);
    if (violationRate > agentPolicy.maxViolationRate) {
      throw new ConfigError({
        message: `Policy violation: violation rate ${violationRate.toFixed(2)} per file exceeds maximum ${String(agentPolicy.maxViolationRate)}.`,
        context: `designlint.policy.json → agentPolicy.maxViolationRate`,
        remediation: `Fix violations to bring the per-file rate below ${String(agentPolicy.maxViolationRate)}.`,
      });
    }
  }
}
