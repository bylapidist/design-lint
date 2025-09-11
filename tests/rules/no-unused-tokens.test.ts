import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLinter as initLinter } from '../../src/index.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import type { Environment } from '../../src/core/environment.ts';

async function tempFile(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-'));
  const file = path.join(dir, 'file.ts');
  await fs.writeFile(file, content);
  return path.relative(process.cwd(), file);
}

void test('design-system/no-unused-tokens reports unused tokens', async () => {
  const file = await tempFile('const color = "#000000";');
  const tokens = {
    color: {
      primary: { $value: '#000000', $type: 'color' },
      unused: { $value: '#123456', $type: 'color' },
    },
  };
  const env: Environment = {
    documentSource: new FileSource(),
    tokenProvider: {
      load: () => Promise.resolve({ default: tokens }),
    },
  };
  const linter = initLinter(
    {
      tokens,
      rules: { 'design-system/no-unused-tokens': 'warn' },
    },
    env,
  );
  const { results } = await linter.lintTargets([file]);
  const msg = results
    .flatMap((r) => r.messages)
    .find((m) => m.ruleId === 'design-system/no-unused-tokens');
  assert(msg);
  assert.equal(msg.severity, 'warn');
  assert.ok(msg.message.includes('#123456'));
});

void test('design-system/no-unused-tokens includes token metadata', async () => {
  const file = await tempFile('');
  const tokens = {
    color: {
      unused: {
        $value: '#123456',
        $type: 'color',
        $deprecated: 'deprecated',
        $extensions: { 'vendor.foo': true },
      },
    },
  };
  const env: Environment = {
    documentSource: new FileSource(),
    tokenProvider: {
      load: () => Promise.resolve({ default: tokens }),
    },
  };
  const linter = initLinter(
    {
      tokens,
      rules: { 'design-system/no-unused-tokens': 'warn' },
    },
    env,
  );
  const { results } = await linter.lintTargets([file]);
  const msg = results
    .flatMap((r) => r.messages)
    .find((m) => m.ruleId === 'design-system/no-unused-tokens');
  assert(msg);
  assert(msg.metadata);
  assert.equal(msg.metadata.path, 'color.unused');
  assert.equal(msg.metadata.deprecated, 'deprecated');
  assert.deepEqual(msg.metadata.extensions, { 'vendor.foo': true });
});

void test('design-system/no-unused-tokens passes when tokens used', async () => {
  const file = await tempFile('const color = "#000000";');
  const tokens = {
    color: {
      primary: { $value: '#000000', $type: 'color' },
    },
  };
  const env: Environment = {
    documentSource: new FileSource(),
    tokenProvider: {
      load: () => Promise.resolve({ default: tokens }),
    },
  };
  const linter = initLinter(
    {
      tokens,
      rules: { 'design-system/no-unused-tokens': 'error' },
    },
    env,
  );
  const { results } = await linter.lintTargets([file]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});

void test('design-system/no-unused-tokens can ignore tokens', async () => {
  const file = await tempFile('const color = "#000000";');
  const tokens = {
    color: {
      primary: { $value: '#000000', $type: 'color' },
      unused: { $value: '#123456', $type: 'color' },
    },
  };
  const env: Environment = {
    documentSource: new FileSource(),
    tokenProvider: {
      load: () => Promise.resolve({ default: tokens }),
    },
  };
  const linter = initLinter(
    {
      tokens,
      rules: {
        'design-system/no-unused-tokens': ['warn', { ignore: ['#123456'] }],
      },
    },
    env,
  );
  const { results } = await linter.lintTargets([file]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});

void test('design-system/no-unused-tokens matches hex case-insensitively', async () => {
  const file = await tempFile('const color = "#ABCDEF";');
  const tokens = {
    color: { primary: { $value: '#abcdef', $type: 'color' } },
  };
  const env: Environment = {
    documentSource: new FileSource(),
    tokenProvider: {
      load: () => Promise.resolve({ default: tokens }),
    },
  };
  const linter = initLinter(
    {
      tokens,
      rules: { 'design-system/no-unused-tokens': 'warn' },
    },
    env,
  );
  const { results } = await linter.lintTargets([file]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});
