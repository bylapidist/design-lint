/**
 * Unit tests for the SARIF formatter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sarifFormatter } from '../../../src/formatters/sarif/sarif-formatter.js';
import type { LintResult } from '../../../src/core/types.js';

interface SarifLog {
  runs: {
    tool: {
      driver: {
        rules: {
          id: string;
          shortDescription: { text: string };
          properties?: { category: string };
        }[];
      };
    };
    results: { ruleId: string; ruleIndex: number }[];
  }[];
}

void test('sarif formatter outputs rules and links results', () => {
  const results: LintResult[] = [
    {
      sourceId: 'file.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'first',
          severity: 'error',
          line: 1,
          column: 1,
        },
        {
          ruleId: 'rule',
          message: 'second',
          severity: 'error',
          line: 2,
          column: 2,
        },
      ],
      ruleDescriptions: { rule: 'rule description' },
    },
  ];
  const out = sarifFormatter(results);
  const parsed: unknown = JSON.parse(out);
  const run = (parsed as SarifLog).runs[0];
  assert.equal(run.tool.driver.rules.length, 1);
  assert.equal(run.tool.driver.rules[0].id, 'rule');
  assert.equal(
    run.tool.driver.rules[0].shortDescription.text,
    'rule description',
  );
  assert.equal(run.results[0].ruleId, 'rule');
  assert.equal(run.results[0].ruleIndex, 0);
});

void test('sarif formatter updates rule descriptions from later results', () => {
  const results: LintResult[] = [
    {
      sourceId: 'a.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'first',
          severity: 'error',
          line: 1,
          column: 1,
        },
      ],
    },
    {
      sourceId: 'b.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'second',
          severity: 'error',
          line: 1,
          column: 1,
        },
      ],
      ruleDescriptions: { rule: 'rule description' },
    },
  ];
  const out = sarifFormatter(results);
  const parsed: unknown = JSON.parse(out);
  const run = (parsed as SarifLog).runs[0];
  assert.equal(run.tool.driver.rules.length, 1);
  assert.equal(
    run.tool.driver.rules[0].shortDescription.text,
    'rule description',
  );
});

void test('sarif formatter includes rule categories', () => {
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
      ruleCategories: { rule: 'design-token' },
    },
  ];
  const out = sarifFormatter(results);
  const parsed: unknown = JSON.parse(out);
  const run = (parsed as SarifLog).runs[0];
  assert.equal(run.tool.driver.rules[0].properties?.category, 'design-token');
});
