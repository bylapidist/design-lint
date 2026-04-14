/**
 * Tests for config preset packages:
 *   @lapidist/design-lint-config-recommended
 *   @lapidist/design-lint-config-strict
 *   @lapidist/design-lint-config-ai-agent
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import recommended from '../packages/config-recommended/src/index.js';
import strict from '../packages/config-strict/src/index.js';
import aiAgent from '../packages/config-ai-agent/src/index.js';
import { builtInRules } from '../src/rules/index.js';
import type { Config } from '../src/index.js';

// ---------------------------------------------------------------------------
// Shape guards
// ---------------------------------------------------------------------------

function isValidSeverity(v: unknown): v is 'error' | 'warn' | 'off' {
  return v === 'error' || v === 'warn' || v === 'off';
}

function isUnknownArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function assertValidConfig(config: Config, name: string): void {
  const rules: Record<string, unknown> = config.rules ?? {};
  for (const [ruleId, value] of Object.entries(rules)) {
    const severity: unknown = isUnknownArray(value) ? value[0] : value;
    assert.ok(
      isValidSeverity(severity),
      `${name}.rules["${ruleId}"] has invalid severity: ${String(severity)}`,
    );
  }
}

const builtInRuleNames = new Set(builtInRules.map((r) => r.name));

function assertRulesExist(config: Config, name: string): void {
  for (const ruleId of Object.keys(config.rules ?? {})) {
    assert.ok(
      builtInRuleNames.has(ruleId),
      `${name} references unknown rule "${ruleId}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// config-recommended
// ---------------------------------------------------------------------------

void test('config-recommended exports a rules object', () => {
  assertValidConfig(recommended, 'recommended');
});

void test('config-recommended all rules reference existing built-ins', () => {
  assertRulesExist(recommended, 'recommended');
});

void test('config-recommended uses warn severity for all rules', () => {
  for (const [ruleId, value] of Object.entries(recommended.rules)) {
    const severity: unknown = isUnknownArray(value) ? value[0] : value;
    assert.equal(
      severity,
      'warn',
      `recommended.rules["${ruleId}"] should be 'warn', got '${String(severity)}'`,
    );
  }
});

void test('config-recommended includes core token rules', () => {
  assert.ok(
    'design-token/colors' in recommended.rules,
    'should include design-token/colors',
  );
  assert.ok(
    'design-token/spacing' in recommended.rules,
    'should include design-token/spacing',
  );
  assert.ok(
    'design-token/easing' in recommended.rules,
    'should include design-token/easing',
  );
});

void test('config-recommended includes at least one component rule', () => {
  const componentRules = Object.keys(recommended.rules).filter((r) =>
    r.startsWith('design-system/'),
  );
  assert.ok(componentRules.length > 0, 'should include design-system/* rules');
});

// ---------------------------------------------------------------------------
// config-strict
// ---------------------------------------------------------------------------

void test('config-strict exports a rules object', () => {
  assertValidConfig(strict, 'strict');
});

void test('config-strict all rules reference existing built-ins', () => {
  assertRulesExist(strict, 'strict');
});

void test('config-strict uses error severity for all rules', () => {
  for (const [ruleId, value] of Object.entries(strict.rules)) {
    const severity: unknown = isUnknownArray(value) ? value[0] : value;
    assert.equal(
      severity,
      'error',
      `strict.rules["${ruleId}"] should be 'error', got '${String(severity)}'`,
    );
  }
});

void test('config-strict covers all rules in config-recommended', () => {
  for (const ruleId of Object.keys(recommended.rules)) {
    assert.ok(
      ruleId in strict.rules,
      `strict should include all recommended rules; missing "${ruleId}"`,
    );
  }
});

void test('config-strict has at least as many rules as config-recommended', () => {
  assert.ok(
    Object.keys(strict.rules).length >= Object.keys(recommended.rules).length,
    'strict should have at least as many rules as recommended',
  );
});

// ---------------------------------------------------------------------------
// config-ai-agent
// ---------------------------------------------------------------------------

void test('config-ai-agent exports a rules object', () => {
  assertValidConfig(aiAgent, 'aiAgent');
});

void test('config-ai-agent all rules reference existing built-ins', () => {
  assertRulesExist(aiAgent, 'aiAgent');
});

void test('config-ai-agent uses error severity for all rules', () => {
  for (const [ruleId, value] of Object.entries(aiAgent.rules)) {
    const severity: unknown = isUnknownArray(value) ? value[0] : value;
    assert.equal(
      severity,
      'error',
      `aiAgent.rules["${ruleId}"] should be 'error', got '${String(severity)}'`,
    );
  }
});

void test('config-ai-agent targets AI agent failure modes', () => {
  // These rules are specifically relevant for AI-generated code
  assert.ok(
    'design-token/css-var-provenance' in aiAgent.rules,
    'should include design-token/css-var-provenance',
  );
  assert.ok(
    'design-system/jsx-style-values' in aiAgent.rules,
    'should include design-system/jsx-style-values',
  );
  assert.ok(
    'design-system/no-hardcoded-spacing' in aiAgent.rules,
    'should include design-system/no-hardcoded-spacing',
  );
});

void test('config-ai-agent is composable with config-recommended', () => {
  // Merging recommended + aiAgent should not duplicate rules in a breaking way
  const merged = {
    rules: { ...recommended.rules, ...aiAgent.rules },
  } satisfies Config;
  assertValidConfig(merged, 'merged(recommended+aiAgent)');
  // ai-agent rules should win (all error) for any overlap
  for (const ruleId of Object.keys(aiAgent.rules)) {
    assert.deepStrictEqual(
      merged.rules[ruleId],
      aiAgent.rules[ruleId],
      `merged["${ruleId}"] should equal aiAgent value`,
    );
  }
});

// ---------------------------------------------------------------------------
// Cross-preset invariants
// ---------------------------------------------------------------------------

void test('all presets have non-empty rules', () => {
  assert.ok(
    Object.keys(recommended.rules).length > 0,
    'recommended must have rules',
  );
  assert.ok(Object.keys(strict.rules).length > 0, 'strict must have rules');
  assert.ok(Object.keys(aiAgent.rules).length > 0, 'aiAgent must have rules');
});

void test('no preset references unknown rules', () => {
  for (const [preset, config] of [
    ['recommended', recommended],
    ['strict', strict],
    ['aiAgent', aiAgent],
  ] as [string, Config][]) {
    assertRulesExist(config, preset);
  }
});
