import test from 'node:test';
import assert from 'node:assert/strict';
import { stylish } from '../../src/formatters/stylish.ts';
import { jsonFormatter } from '../../src/formatters/json.ts';
import { sarifFormatter } from '../../src/formatters/sarif.ts';
import { getFormatter } from '../../src.ts';
import type { LintResult } from '../../src/core/types.ts';

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

test('sarif formatter outputs rules and links results', () => {
  const results: LintResult[] = [
    {
      filePath: 'file.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'desc',
          severity: 'error',
          line: 1,
          column: 1,
        },
        {
          ruleId: 'rule',
          message: 'desc',
          severity: 'error',
          line: 2,
          column: 2,
        },
      ],
    },
  ];
  const out = sarifFormatter(results);
  const parsed = JSON.parse(out);
  const run = parsed.runs[0];
  assert.equal(run.tool.driver.rules.length, 1);
  assert.equal(run.tool.driver.rules[0].id, 'rule');
  assert.equal(run.tool.driver.rules[0].shortDescription.text, 'desc');
  assert.equal(run.results[0].ruleId, 'rule');
  assert.equal(run.results[0].ruleIndex, 0);
});

test('getFormatter returns formatter for valid name', () => {
  assert.equal(getFormatter('json'), jsonFormatter);
});

test('getFormatter throws for invalid name', () => {
  assert.throws(() => getFormatter('unknown'), /Unknown formatter/);
});
