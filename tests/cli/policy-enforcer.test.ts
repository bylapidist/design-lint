/**
 * Tests for `enforceRuntimePolicy` in policy-enforcer.ts.
 *
 * Calls the function directly — no subprocess spawning.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceRuntimePolicy } from '../../src/config/policy-enforcer.js';
import type { DesignLintPolicy } from '../../src/core/types.js';
import type { LintResult } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePolicy(
  tokenCoverage: DesignLintPolicy['tokenCoverage'] = {},
  ratchet: DesignLintPolicy['ratchet'] = { mode: 'entropy' },
  agentPolicy?: DesignLintPolicy['agentPolicy'],
): DesignLintPolicy {
  return {
    requiredRules: [],
    minSeverity: {},
    tokenCoverage,
    ratchet,
    agentPolicy,
  };
}

function makeResult(messages: LintResult['messages'] = []): LintResult {
  return { sourceId: 'test.css', messages };
}

function makeMessage(
  ruleId: string,
  severity: 'error' | 'warn' = 'error',
): LintResult['messages'][number] {
  return { ruleId, severity, message: 'test', line: 1, column: 1 };
}

// ---------------------------------------------------------------------------
// tokenCoverage
// ---------------------------------------------------------------------------

void test('enforceRuntimePolicy passes when tokenCoverage 1.0 has no violations', () => {
  const policy = makePolicy({ color: 1 });
  assert.doesNotThrow(() => {
    enforceRuntimePolicy([makeResult()], policy);
  });
});

void test('enforceRuntimePolicy throws when tokenCoverage 1.0 and violations exist', () => {
  const policy = makePolicy({ color: 1 });
  const result = makeResult([makeMessage('design-token/colors')]);
  assert.throws(
    () => {
      enforceRuntimePolicy([result], policy);
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('color'));
      assert.ok(err.message.includes('100%'));
      return true;
    },
  );
});

void test('enforceRuntimePolicy skips tokenCoverage below 1.0 (requires usage stats)', () => {
  const policy = makePolicy({ color: 0.8 });
  const result = makeResult([makeMessage('design-token/colors')]);
  // Sub-100% thresholds cannot be enforced without total usage counts
  assert.doesNotThrow(() => {
    enforceRuntimePolicy([result], policy);
  });
});

// ---------------------------------------------------------------------------
// ratchet — metric mode
// ---------------------------------------------------------------------------

void test('enforceRuntimePolicy passes when violation count within ratchet delta', () => {
  const policy = makePolicy({}, { mode: 'metric', maxDelta: 2 });
  const results = [makeResult([makeMessage('design-token/colors', 'warn')])];
  assert.doesNotThrow(() => {
    enforceRuntimePolicy(results, policy, {
      baseline: { totalCount: 1, score: 90 },
    });
  });
});

void test('enforceRuntimePolicy throws when violation count exceeds ratchet delta', () => {
  const policy = makePolicy({}, { mode: 'metric', maxDelta: 0 });
  const results = [
    makeResult([
      makeMessage('design-token/colors'),
      makeMessage('design-token/font-size'),
    ]),
  ];
  assert.throws(
    () => {
      enforceRuntimePolicy(results, policy, {
        baseline: { totalCount: 0, score: 100 },
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('violation count'));
      return true;
    },
  );
});

void test('enforceRuntimePolicy skips ratchet when no baseline provided', () => {
  const policy = makePolicy({}, { mode: 'metric', maxDelta: 0 });
  const results = [makeResult([makeMessage('design-token/colors')])];
  // Without a baseline there is nothing to compare — should not throw
  assert.doesNotThrow(() => {
    enforceRuntimePolicy(results, policy);
  });
});

// ---------------------------------------------------------------------------
// ratchet — entropy mode
// ---------------------------------------------------------------------------

void test('enforceRuntimePolicy passes when quality score meets minScore', () => {
  const policy = makePolicy({}, { mode: 'entropy', minScore: 95 });
  // Zero violations → score = 100
  assert.doesNotThrow(() => {
    enforceRuntimePolicy([makeResult()], policy, {
      baseline: { totalCount: 0, score: 100 },
    });
  });
});

void test('enforceRuntimePolicy throws when quality score falls below minScore', () => {
  const policy = makePolicy({}, { mode: 'entropy', minScore: 95 });
  // 20 violations on one file → rate = 20 → score = max(0, 100 - 200) = 0
  const messages = Array.from({ length: 20 }, () =>
    makeMessage('design-token/colors'),
  );
  assert.throws(
    () => {
      enforceRuntimePolicy([makeResult(messages)], policy, {
        baseline: { totalCount: 5, score: 98 },
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('score'));
      assert.ok(err.message.includes('below'));
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// agentPolicy
// ---------------------------------------------------------------------------

void test('enforceRuntimePolicy passes when requiredConvergence and no errors', () => {
  const policy = makePolicy(
    {},
    { mode: 'entropy' },
    {
      maxViolationRate: 100,
      requiredConvergence: true,
      trustedAgents: [],
    },
  );
  // Warn-only violations do not block convergence — only errors do
  const result = makeResult([makeMessage('design-token/colors', 'warn')]);
  assert.doesNotThrow(() => {
    enforceRuntimePolicy([result], policy);
  });
});

void test('enforceRuntimePolicy throws when requiredConvergence and errors remain', () => {
  const policy = makePolicy(
    {},
    { mode: 'entropy' },
    {
      maxViolationRate: 100,
      requiredConvergence: true,
      trustedAgents: [],
    },
  );
  const result = makeResult([makeMessage('design-token/colors', 'error')]);
  assert.throws(
    () => {
      enforceRuntimePolicy([result], policy);
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('convergence') ||
          err.message.includes('zero errors'),
      );
      return true;
    },
  );
});

void test('enforceRuntimePolicy throws when violation rate exceeds maxViolationRate', () => {
  const policy = makePolicy(
    {},
    { mode: 'entropy' },
    {
      maxViolationRate: 0.5,
      requiredConvergence: false,
      trustedAgents: [],
    },
  );
  // 2 violations in 1 file = rate 2.0 > 0.5
  const result = makeResult([
    makeMessage('design-token/colors', 'warn'),
    makeMessage('design-token/font-size', 'warn'),
  ]);
  assert.throws(
    () => {
      enforceRuntimePolicy([result], policy);
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('violation rate'));
      return true;
    },
  );
});

void test('enforceRuntimePolicy skips all agentPolicy checks for trusted agents', () => {
  const policy = makePolicy(
    {},
    { mode: 'entropy' },
    {
      maxViolationRate: 0,
      requiredConvergence: true,
      trustedAgents: ['agent-007'],
    },
  );
  const result = makeResult([makeMessage('design-token/colors', 'error')]);
  // Trusted agent — convergence and rate checks are bypassed
  assert.doesNotThrow(() => {
    enforceRuntimePolicy([result], policy, { agentId: 'agent-007' });
  });
});
