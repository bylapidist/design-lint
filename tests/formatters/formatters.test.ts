import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stylish } from '../../src/formatters/stylish.ts';
import { jsonFormatter } from '../../src/formatters/json.ts';
import { sarifFormatter } from '../../src/formatters/sarif.ts';
import { getFormatter } from '../../src/index.ts';
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

test('stylish formatter outputs suggestions', () => {
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
          suggest: '--foo',
        },
      ],
    },
  ];
  const out = stylish(results, false);
  assert.ok(out.includes('Did you mean `--foo`?'));
});

test('stylish formatter uses yellow summary when only warnings', () => {
  const results: LintResult[] = [
    {
      filePath: 'file.ts',
      messages: [
        {
          ruleId: 'rule',
          message: 'warn msg',
          severity: 'warn',
          line: 1,
          column: 1,
        },
      ],
    },
  ];
  const out = stylish(results);
  assert.ok(out.includes('\x1b[33m1 problems (0 errors, 1 warnings)\x1b[0m'));
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
  const parsed = JSON.parse(out);
  const run = parsed.runs[0];
  assert.equal(run.tool.driver.rules.length, 1);
  assert.equal(run.tool.driver.rules[0].id, 'rule');
  assert.equal(
    run.tool.driver.rules[0].shortDescription.text,
    'rule description',
  );
  assert.equal(run.results[0].ruleId, 'rule');
  assert.equal(run.results[0].ruleIndex, 0);
});

test('getFormatter returns formatter for valid name', async () => {
  assert.equal(await getFormatter('json'), jsonFormatter);
});

test('getFormatter loads formatter from path', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const formatterPath = join(__dirname, 'fixtures', 'custom-formatter.ts');
  const formatter = await getFormatter(formatterPath);
  const out = formatter([{ filePath: 'a', messages: [] }]);
  assert.equal(out, 'custom:1');
});

test('getFormatter throws for invalid name', async () => {
  await assert.rejects(() => getFormatter('unknown'), /Unknown formatter/);
});
