/**
 * Unit tests for the JSON formatter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonFormatter } from '../../../src/formatters/index.js';
import type { LintResult, DesignTokens } from '../../../src/core/types.js';
import { TokenTracker } from '../../../src/core/token-tracker.js';

void test('json formatter outputs json', () => {
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
  const out = jsonFormatter(results);
  const parsed = JSON.parse(out) as { sourceId: string }[];
  assert.equal(parsed[0]?.sourceId, 'file.ts');
});

void test('json formatter serializes metadata and categories', () => {
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
  const out = jsonFormatter(results);
  const parsed = JSON.parse(out) as LintResult[];
  assert.equal(parsed[0]?.messages[0]?.metadata?.foo, 'bar');
  assert.equal(parsed[0]?.ruleCategories?.rule, 'design-token');
});

void test('json formatter serializes token metadata', async () => {
  const tokens: DesignTokens = {
    color: {
      unused: {
        $value: '#123456',
        $type: 'color',
        $deprecated: 'deprecated',
        $extensions: { 'vendor.foo': true },
      },
    },
  };
  const tracker = new TokenTracker({
    load: () => Promise.resolve({ default: tokens }),
  });
  await tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      severity: 'warn',
      options: {},
    },
  ]);
  const results = tracker.generateReports('config');
  const out = jsonFormatter(results);
  const parsed = JSON.parse(out) as LintResult[];
  const meta = parsed[0].messages[0].metadata;
  assert(meta);
  assert.equal(meta.path, 'color.unused');
  assert.equal(meta.deprecated, 'deprecated');
  assert.deepEqual(meta.extensions, { 'vendor.foo': true });
});
