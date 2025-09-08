import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Linter } from '../../src/index.ts';
import { FileSource } from '../../src/index.ts';

async function tempFile(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-'));
  const file = path.join(dir, 'file.ts');
  await fs.writeFile(file, content);
  return path.relative(process.cwd(), file);
}

void test('design-system/no-unused-tokens reports unused tokens', async () => {
  const file = await tempFile('const color = "#000000";');
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#000000', unused: '#123456' } },
      rules: { 'design-system/no-unused-tokens': 'warn' },
    },
    new FileSource(),
  );
  const { results } = await linter.lintFiles([file]);
  const msg = results
    .flatMap((r) => r.messages)
    .find((m) => m.ruleId === 'design-system/no-unused-tokens');
  assert(msg);
  assert.equal(msg.severity, 'warn');
  assert.ok(msg.message.includes('#123456'));
});

void test('design-system/no-unused-tokens passes when tokens used', async () => {
  const file = await tempFile('const color = "#000000";');
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#000000' } },
      rules: { 'design-system/no-unused-tokens': 'error' },
    },
    new FileSource(),
  );
  const { results } = await linter.lintFiles([file]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});

void test('design-system/no-unused-tokens can ignore tokens', async () => {
  const file = await tempFile('const color = "#000000";');
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#000000', unused: '#123456' } },
      rules: {
        'design-system/no-unused-tokens': ['warn', { ignore: ['#123456'] }],
      },
    },
    new FileSource(),
  );
  const { results } = await linter.lintFiles([file]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});

void test('design-system/no-unused-tokens matches hex case-insensitively', async () => {
  const file = await tempFile('const color = "#ABCDEF";');
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#abcdef' } },
      rules: { 'design-system/no-unused-tokens': 'warn' },
    },
    new FileSource(),
  );
  const { results } = await linter.lintFiles([file]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});
