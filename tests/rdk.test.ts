/**
 * Tests for @lapidist/design-lint-rdk — runTests and RdkRunResult shape.
 *
 * The watchRule function uses fs.watch and dynamic import so it is not
 * covered here (tested via integration in the CLI/RDK dev server).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { runTests } from '../packages/rdk/src/runner.js';
import { noHardcodedSpacingRule } from '../src/rules/no-hardcoded-spacing.js';
import type { RuleModule } from '../src/index.js';

// ---------------------------------------------------------------------------
// runTests — passing suites
// ---------------------------------------------------------------------------

void test('runTests returns passed=true when all valid cases pass', async () => {
  const result = await runTests(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [
        { code: 'a { margin: 0; }', fileType: 'css' },
        { code: 'a { padding: var(--space-4); }', fileType: 'css' },
      ],
      invalid: [],
    },
  );

  assert.equal(result.passed, true);
  assert.equal(result.total, 2);
  assert.equal(result.passing, 2);
  assert.equal(result.failing, 0);
  assert.deepEqual(result.errors, []);
  assert.ok(result.durationMs >= 0);
});

void test('runTests returns passed=true when all invalid cases match expected errors', async () => {
  const result = await runTests(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [{ ruleId: 'design-system/no-hardcoded-spacing' }],
        },
      ],
    },
  );

  assert.equal(result.passed, true);
  assert.equal(result.total, 1);
  assert.equal(result.passing, 1);
  assert.equal(result.failing, 0);
});

void test('runTests returns passed=true for empty test suite', async () => {
  const result = await runTests(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    { valid: [], invalid: [] },
  );

  assert.equal(result.passed, true);
  assert.equal(result.total, 0);
  assert.equal(result.passing, 0);
  assert.equal(result.failing, 0);
});

// ---------------------------------------------------------------------------
// runTests — failing suites
// ---------------------------------------------------------------------------

void test('runTests returns passed=false when a valid case triggers unexpected diagnostics', async () => {
  const result = await runTests(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      // This code triggers the rule — passing it as valid should fail
      valid: [{ code: 'a { margin: 16px; }', fileType: 'css' }],
      invalid: [],
    },
  );

  assert.equal(result.passed, false);
  assert.ok(result.failing > 0);
  assert.ok(result.errors.length > 0);
});

void test('runTests returns passed=false when an invalid case produces no diagnostics', async () => {
  const result = await runTests(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [],
      invalid: [
        {
          // This code is valid — zero diagnostics — but we expect one
          code: 'a { margin: 0; }',
          fileType: 'css',
          errors: [{ ruleId: 'design-system/no-hardcoded-spacing' }],
        },
      ],
    },
  );

  assert.equal(result.passed, false);
  assert.ok(result.errors.length > 0);
});

void test('runTests captures the error message in the errors array', async () => {
  const result = await runTests(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [{ code: 'a { margin: 16px; }', fileType: 'css' }],
      invalid: [],
    },
  );

  assert.ok(result.errors.length > 0);
  assert.ok(typeof result.errors[0] === 'string');
  assert.ok(result.errors[0].length > 0);
});

// ---------------------------------------------------------------------------
// runTests — mixed valid/invalid
// ---------------------------------------------------------------------------

void test('runTests handles mixed valid and invalid cases', async () => {
  const result = await runTests(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [{ code: 'a { margin: 0; }', fileType: 'css' }],
      invalid: [
        {
          code: 'a { padding: 8px; }',
          fileType: 'css',
          errors: [{ ruleId: 'design-system/no-hardcoded-spacing' }],
        },
      ],
    },
  );

  assert.equal(result.passed, true);
  assert.equal(result.total, 2);
});

// ---------------------------------------------------------------------------
// runTests — durationMs
// ---------------------------------------------------------------------------

void test('runTests always returns a non-negative durationMs', async () => {
  const result = await runTests(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    { valid: [{ code: 'a { color: red; }', fileType: 'css' }], invalid: [] },
  );

  assert.ok(typeof result.durationMs === 'number');
  assert.ok(result.durationMs >= 0);
});

// ---------------------------------------------------------------------------
// runTests — custom silent rule
// ---------------------------------------------------------------------------

void test('runTests works with a rule that never reports', async () => {
  const silentRule: RuleModule = {
    name: 'test/silent',
    meta: { description: 'never reports' },
    create: () => ({}),
  };

  const result = await runTests('test/silent', silentRule, {
    valid: [
      { code: 'a { color: red; }', fileType: 'css' },
      { code: '.x { font-size: 14px; }', fileType: 'css' },
    ],
    invalid: [],
  });

  assert.equal(result.passed, true);
  assert.equal(result.total, 2);
});
