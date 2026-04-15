/**
 * @packageDocumentation
 *
 * Enforces a `DesignLintPolicy` against a resolved `Config`.
 *
 * Enforcement is intentionally simple: it checks the static rule
 * configuration and raises a `ConfigError` when the policy is violated.
 * Dynamic enforcement (token coverage ratios, ratchet, agent policy) requires
 * runtime data from the DSR kernel and is handled separately.
 */
import type { Config } from '../core/linter.js';
import type { DesignLintPolicy } from '../core/types.js';
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
