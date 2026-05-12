/**
 * Tests for @lapidist/design-lint-testing — RuleTester and SnippetLinter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleTester, SnippetLinter } from '../packages/testing/src/index.js';
import { noHardcodedSpacingRule } from '../src/rules/no-hardcoded-spacing.js';
import type { RuleModule } from '../src/index.js';

// ---------------------------------------------------------------------------
// SnippetLinter
// ---------------------------------------------------------------------------

void test('SnippetLinter returns no diagnostics for rule-compliant CSS', async () => {
  const linter = new SnippetLinter(noHardcodedSpacingRule);
  const messages = await linter.lintSnippet('a { margin: 0; }', 'css');
  assert.equal(messages.length, 0);
});

void test('SnippetLinter flags a hard-coded spacing value in CSS', async () => {
  const linter = new SnippetLinter(noHardcodedSpacingRule);
  const messages = await linter.lintSnippet('a { margin: 16px; }', 'css');
  assert.ok(messages.length > 0);
  assert.ok(messages[0].message.includes('Hard-coded spacing value'));
});

void test('SnippetLinter accepts rule options', async () => {
  // noHardcodedSpacingRule takes z.void() so any option is acceptable —
  // verify the call path does not throw with options present
  const linter = new SnippetLinter(noHardcodedSpacingRule, undefined);
  const messages = await linter.lintSnippet(
    'a { padding: var(--space-4); }',
    'css',
  );
  assert.equal(messages.length, 0);
});

// ---------------------------------------------------------------------------
// RuleTester — valid cases
// ---------------------------------------------------------------------------

void test('RuleTester passes when a valid case produces no diagnostics', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await tester.run(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [{ code: 'a { margin: 0; }', fileType: 'css' }],
      invalid: [],
    },
  );
});

void test('RuleTester passes when multiple valid cases produce no diagnostics', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await tester.run(
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
});

void test('RuleTester uses defaultFileType when case omits fileType', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  // Valid case: fileType falls through to default 'css'
  await tester.run(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      // @ts-expect-error — deliberately omitting fileType to exercise the default
      valid: [{ code: 'a { margin: 0; }' }],
      invalid: [],
    },
  );
});

// ---------------------------------------------------------------------------
// RuleTester — invalid cases
// ---------------------------------------------------------------------------

void test('RuleTester passes when an invalid case produces the expected diagnostics', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await tester.run(
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
});

void test('RuleTester passes with message substring check', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await tester.run(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [{ message: 'Hard-coded spacing value' }],
        },
      ],
    },
  );
});

void test('RuleTester passes with line and column checks', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await tester.run(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [{ line: 1, column: 5 }],
        },
      ],
    },
  );
});

void test('RuleTester passes with all error fields checked together', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await tester.run(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      valid: [],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [
            {
              ruleId: 'design-system/no-hardcoded-spacing',
              message: 'Hard-coded spacing value',
              line: 1,
              column: 5,
            },
          ],
        },
      ],
    },
  );
});

// ---------------------------------------------------------------------------
// RuleTester — assertion failures (the tester itself must throw)
// ---------------------------------------------------------------------------

void test('RuleTester throws when a valid case produces unexpected diagnostics', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await assert.rejects(
    tester.run('design-system/no-hardcoded-spacing', noHardcodedSpacingRule, {
      // This code IS invalid — passing it as valid must throw
      valid: [{ code: 'a { margin: 16px; }', fileType: 'css' }],
      invalid: [],
    }),
    /unexpected diagnostics/i,
  );
});

void test('RuleTester throws when an invalid case produces too few diagnostics', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await assert.rejects(
    tester.run('design-system/no-hardcoded-spacing', noHardcodedSpacingRule, {
      valid: [],
      invalid: [
        {
          // No violation — zero diagnostics — but we expect one
          code: 'a { margin: 0; }',
          fileType: 'css',
          errors: [{ ruleId: 'design-system/no-hardcoded-spacing' }],
        },
      ],
    }),
    /expected at least 1/i,
  );
});

void test('RuleTester throws on ruleId mismatch', async () => {
  // Create a minimal rule that reports with a different ruleId stored in the
  // message — but we check the actual ruleId field set by the linter, which is
  // always rule.name.  Use a one-off rule that matches but then verify mismatch.
  const tester = new RuleTester({ defaultFileType: 'css' });
  await assert.rejects(
    tester.run('design-system/no-hardcoded-spacing', noHardcodedSpacingRule, {
      valid: [],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [{ ruleId: 'some/other-rule' }],
        },
      ],
    }),
    /ruleId mismatch/i,
  );
});

void test('RuleTester throws on message mismatch', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await assert.rejects(
    tester.run('design-system/no-hardcoded-spacing', noHardcodedSpacingRule, {
      valid: [],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [{ message: 'this substring is not in the actual message' }],
        },
      ],
    }),
    /does not include/i,
  );
});

void test('RuleTester throws on line mismatch', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await assert.rejects(
    tester.run('design-system/no-hardcoded-spacing', noHardcodedSpacingRule, {
      valid: [],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [{ line: 99 }],
        },
      ],
    }),
    /line mismatch/i,
  );
});

void test('RuleTester throws on column mismatch', async () => {
  const tester = new RuleTester({ defaultFileType: 'css' });
  await assert.rejects(
    tester.run('design-system/no-hardcoded-spacing', noHardcodedSpacingRule, {
      valid: [],
      invalid: [
        {
          code: 'a { margin: 16px; }',
          fileType: 'css',
          errors: [{ column: 99 }],
        },
      ],
    }),
    /column mismatch/i,
  );
});

// ---------------------------------------------------------------------------
// RuleTester — constructor defaults
// ---------------------------------------------------------------------------

void test('RuleTester uses "css" as defaultFileType when none provided', async () => {
  const tester = new RuleTester();
  // If default is css, this valid css snippet should pass
  await tester.run(
    'design-system/no-hardcoded-spacing',
    noHardcodedSpacingRule,
    {
      // @ts-expect-error — omit fileType to exercise the default
      valid: [{ code: 'a { margin: 0; }' }],
      invalid: [],
    },
  );
});

// ---------------------------------------------------------------------------
// RuleTester — edge: minimal rule with no violations
// ---------------------------------------------------------------------------

void test('RuleTester handles a rule that never reports', async () => {
  const silentRule: RuleModule = {
    name: 'test/silent',
    meta: { description: 'never reports' },
    create: () => ({}),
  };
  const tester = new RuleTester({ defaultFileType: 'css' });
  await tester.run('test/silent', silentRule, {
    valid: [{ code: 'a { color: red; }', fileType: 'css' }],
    invalid: [],
  });
});
