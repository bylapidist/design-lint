/**
 * @packageDocumentation
 *
 * Loads and merges `designlint.policy.json` files.
 *
 * Policy files are resolved relative to the nearest config file directory
 * (or cwd when no config is found). They support an `extends` array that
 * is resolved in the same way as Node `require.resolve` — absolute paths,
 * relative paths (resolved from the directory of the file that contains
 * the `extends` entry), or bare package specifiers.
 *
 * Merged result: earlier entries in the `extends` array take lower precedence
 * than later entries, and the root policy wins over all extends.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { z } from 'zod';

const _require = createRequire(import.meta.url);
import type { DesignLintPolicy, PolicySeverity } from '../core/types.js';
import { ConfigError } from '../core/errors.js';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const policySeveritySchema: z.ZodType<PolicySeverity> = z.union([
  z.literal('error'),
  z.literal('warn'),
]);

const policyRatchetSchema = z.object({
  mode: z.union([z.literal('entropy'), z.literal('metric')]),
  maxDelta: z.number().optional(),
  minScore: z.number().min(0).max(100).optional(),
});

const agentPolicySchema = z.object({
  maxViolationRate: z.number().min(0),
  requiredConvergence: z.boolean(),
  trustedAgents: z.array(z.string()),
});

const policySchema = z.object({
  extends: z.array(z.string()).optional(),
  requiredRules: z.array(z.string()).default([]),
  minSeverity: z.record(z.string(), policySeveritySchema).default({}),
  tokenCoverage: z.record(z.string(), z.number().min(0).max(1)).default({}),
  agentPolicy: agentPolicySchema.optional(),
  ratchet: policyRatchetSchema.default({ mode: 'entropy' }),
});

// ---------------------------------------------------------------------------
// Policy file candidates
// ---------------------------------------------------------------------------

const POLICY_FILENAME = 'designlint.policy.json';

/**
 * Searches upward from `startDir` for a `designlint.policy.json` file,
 * stopping at the filesystem root.
 */
function findPolicyFile(startDir: string): string | undefined {
  let dir = startDir;
  for (;;) {
    const candidate = path.join(dir, POLICY_FILENAME);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

// ---------------------------------------------------------------------------
// Single-file parse
// ---------------------------------------------------------------------------

function parseRaw(filePath: string): DesignLintPolicy {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new ConfigError({
      message: `Failed to read policy file "${filePath}": ${String(err instanceof Error ? err.message : err)}`,
      context: filePath,
      remediation: 'Ensure the file exists and contains valid JSON.',
    });
  }
  const result = policySchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError({
      message: `Invalid policy file "${filePath}": ${result.error.message}`,
      context: filePath,
      remediation: 'Review and fix the policy file.',
    });
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Severity ordering
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<PolicySeverity, number> = { warn: 1, error: 2 };

function higherSeverity(a: PolicySeverity, b: PolicySeverity): PolicySeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

function mergePolicies(
  base: DesignLintPolicy,
  override: DesignLintPolicy,
): DesignLintPolicy {
  const requiredRules = [
    ...new Set([...base.requiredRules, ...override.requiredRules]),
  ];

  const minSeverity: Record<string, PolicySeverity> = { ...base.minSeverity };
  for (const [ruleId, sev] of Object.entries(override.minSeverity)) {
    if (Object.hasOwn(minSeverity, ruleId)) {
      minSeverity[ruleId] = higherSeverity(minSeverity[ruleId], sev);
    } else {
      minSeverity[ruleId] = sev;
    }
  }

  const tokenCoverage: Partial<Record<string, number>> = {
    ...base.tokenCoverage,
  };
  for (const [type, ratio] of Object.entries(override.tokenCoverage)) {
    if (ratio === undefined) continue;
    const existing = tokenCoverage[type];
    tokenCoverage[type] =
      existing !== undefined ? Math.max(existing, ratio) : ratio;
  }

  return {
    requiredRules,
    minSeverity,
    tokenCoverage,
    agentPolicy: override.agentPolicy ?? base.agentPolicy,
    ratchet: override.ratchet,
  };
}

// ---------------------------------------------------------------------------
// Resolve extends (recursive)
// ---------------------------------------------------------------------------

function resolveExtends(
  filePath: string,
  visited: Set<string> = new Set<string>(),
): DesignLintPolicy {
  const real = path.resolve(filePath);
  if (visited.has(real)) {
    throw new ConfigError({
      message: `Circular policy extends detected at "${filePath}"`,
      context: filePath,
      remediation: 'Remove the circular reference from the extends array.',
    });
  }
  visited.add(real);

  const policy = parseRaw(real);
  const dir = path.dirname(real);

  let merged: DesignLintPolicy = {
    requiredRules: [],
    minSeverity: {},
    tokenCoverage: {},
    ratchet: { mode: 'entropy' },
  };

  for (const ref of policy.extends ?? []) {
    const resolved = ref.startsWith('.')
      ? path.resolve(dir, ref)
      : _require.resolve(ref);
    const extended = resolveExtends(resolved, visited);
    merged = mergePolicies(merged, extended);
  }

  return mergePolicies(merged, policy);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempts to load and merge `designlint.policy.json` starting from
 * `startDir`. Returns `undefined` when no policy file is found, allowing
 * the caller to treat a missing policy as "no restrictions".
 *
 * @param startDir - Directory to start the upward search from (typically the
 *   directory containing the nearest `designlint.config.json`).
 * @returns The resolved policy, or `undefined` if none is found.
 */
export function loadPolicy(startDir: string): DesignLintPolicy | undefined {
  const filePath = findPolicyFile(startDir);
  if (filePath === undefined) return undefined;
  return resolveExtends(filePath);
}
