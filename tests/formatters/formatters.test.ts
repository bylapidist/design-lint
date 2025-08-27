import test from 'node:test';
import assert from 'node:assert/strict';
import { stylish } from '../../src/formatters/stylish';
import { jsonFormatter } from '../../src/formatters/json';
import { sarifFormatter } from '../../src/formatters/sarif';
import type { LintResult } from '../../src/core/types';

test('stylish formatter outputs text', () => {
  const results: LintResult[] = [
    {
      filePath: 'file.ts',
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
  const out = stylish(results, false);
  assert.ok(out.includes('file.ts'));
});

test('json formatter outputs json', () => {
  const results: LintResult[] = [
    {
      filePath: 'file.ts',
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
  const parsed = JSON.parse(out);
  assert.equal(parsed[0].filePath, 'file.ts');
});

test('sarif formatter outputs sarif log', () => {
  const results: LintResult[] = [
    {
      filePath: 'file.ts',
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
  const out = sarifFormatter(results);
  const parsed = JSON.parse(out);
  assert.equal(parsed.runs[0].results[0].ruleId, 'rule');
});
