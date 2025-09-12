/**
 * Unit tests for the stylish formatter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { stylishFormatter } from '../../../src/formatters/index.js';
import type { LintResult } from '../../../src/core/types.js';
import { join } from 'node:path';

void test('stylish formatter outputs text', () => {
  const results: LintResult[] = [
    {
      sourceId: 'file.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'msg',
          severity: 'error',
          line: 1,
          column: 1,
        },
      ],
    },
  ];
  const out = stylishFormatter(results, false);
  assert.ok(out.includes('file.ts'));
});

void test('stylish formatter outputs suggestions', () => {
  const results: LintResult[] = [
    {
      sourceId: 'file.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'msg',
          severity: 'error',
          line: 1,
          column: 1,
          suggest: '--foo',
        },
      ],
    },
  ];
  const out = stylishFormatter(results, false);
  assert.ok(out.includes('Did you mean `--foo`?'));
});

void test('stylish formatter outputs categories and ignores metadata', () => {
  const results: LintResult[] = [
    {
      sourceId: 'file.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'msg',
          severity: 'error',
          line: 1,
          column: 1,
          metadata: { foo: 'bar' },
        },
      ],
      ruleCategories: { rule: 'design-token' },
    },
  ];
  const out = stylishFormatter(results, false);
  assert.ok(out.includes('design-token'));
  assert.ok(!out.includes('foo'));
});

void test('stylish formatter outputs OK for files without messages', () => {
  const results: LintResult[] = [
    { sourceId: 'a.ts', messages: [] },
    { sourceId: 'b.ts', messages: [] },
  ];
  const out = stylishFormatter(results, false);
  assert.equal(out, '[OK] a.ts\n[OK] b.ts');
});

void test('stylish formatter outputs relative paths', () => {
  const abs = join(process.cwd(), 'c.ts');
  const results: LintResult[] = [{ sourceId: abs, messages: [] }];
  const out = stylishFormatter(results, false);
  assert.equal(out, '[OK] c.ts');
});

void test('stylish formatter does not insert blank line before summary', () => {
  const results: LintResult[] = [
    {
      sourceId: 'a.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'msg',
          severity: 'error',
          line: 1,
          column: 1,
        },
      ],
    },
  ];
  const out = stylishFormatter(results, false);
  assert.equal(
    out,
    'a.ts\n  1:1  error  msg  rule\n1 problems (1 errors, 0 warnings)',
  );
});
