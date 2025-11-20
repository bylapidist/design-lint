/**
 * Unit tests for the JSON formatter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
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
  const fixturePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'fixtures',
    'svelte',
    'designlint.config.json',
  );
  const config = JSON.parse(await readFile(fixturePath, 'utf8')) as {
    tokens: DesignTokens;
  };
  const tokens = config.tokens;
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
  const allMetadata = parsed
    .flatMap((result) => result.messages)
    .map((message) => message.metadata)
    .filter((metadata): metadata is NonNullable<typeof metadata> => Boolean(metadata));

  assert(allMetadata.length > 0);

  const fontMeta = allMetadata.find((metadata) => metadata.path === 'fonts.sans');
  assert(fontMeta);
  assert.equal(fontMeta.pointer, '#/fonts/sans');
  assert.deepEqual(fontMeta.extensions ?? {}, {});
});
