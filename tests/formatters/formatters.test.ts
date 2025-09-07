import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stylish } from '../../src/formatters/stylish.ts';
import { jsonFormatter } from '../../src/formatters/json.ts';
import { sarifFormatter } from '../../src/formatters/sarif.ts';
import { getFormatter } from '../../src/index.ts';
import type { LintResult } from '../../src/core/types.ts';

interface SarifLog {
  runs: {
    tool: {
      driver: { rules: { id: string; shortDescription: { text: string } }[] };
    };
    results: { ruleId: string; ruleIndex: number }[];
  }[];
}

void test('stylish formatter outputs text', () => {
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

void test('stylish formatter outputs suggestions', () => {
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

void test('stylish formatter outputs OK for files without messages', () => {
  const results: LintResult[] = [
    { filePath: 'a.ts', messages: [] },
    { filePath: 'b.ts', messages: [] },
  ];
  const out = stylish(results, false);
  assert.equal(out, '[OK] a.ts\n[OK] b.ts');
});

void test('stylish formatter outputs relative paths', () => {
  const abs = join(process.cwd(), 'c.ts');
  const results: LintResult[] = [{ filePath: abs, messages: [] }];
  const out = stylish(results, false);
  assert.equal(out, '[OK] c.ts');
});

void test('stylish formatter does not insert blank line before summary', () => {
  const results: LintResult[] = [
    {
      filePath: 'a.ts',
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
  assert.equal(
    out,
    'a.ts\n  1:1  error  msg  rule\n1 problems (1 errors, 0 warnings)',
  );
});

void test('json formatter outputs json', () => {
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
  const parsed = JSON.parse(out) as { filePath: string }[];
  assert.equal(parsed[0]?.filePath, 'file.ts');
});

void test('sarif formatter outputs rules and links results', () => {
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
      filePath: 'a.ts',
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
      filePath: 'b.ts',
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

void test('getFormatter returns formatter for valid name', async () => {
  assert.equal(await getFormatter('json'), jsonFormatter);
});

void test('getFormatter resolves formatter relative to cwd', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const prev = process.cwd();
  process.chdir(fixtureDir);
  try {
    const formatter = await getFormatter('./custom-formatter.ts');
    const out = formatter([{ filePath: 'a', messages: [] }]);
    assert.equal(out, 'custom:1');
  } finally {
    process.chdir(prev);
  }
});

void test('getFormatter throws for invalid name', async () => {
  await assert.rejects(() => getFormatter('unknown'), /Unknown formatter/);
});
