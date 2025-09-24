import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { ensureDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';
import type { LintDocument } from '../../src/core/environment.js';

void test('design-system/no-unused-tokens reports unused tokens', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: { $type: 'string', $value: '#000000' },
      unused: { $type: 'string', $value: '#123456' },
    },
  };
  const linter = initLinter(
    {
      tokens,
      rules: { 'design-system/no-unused-tokens': 'warn' },
    },
    new FileSource(),
  );
  const doc: LintDocument = {
    id: 'file.ts',
    type: 'ts',
    getText: () => Promise.resolve('const color = "#000000";'),
  };
  const { results } = await linter.lintDocuments([doc]);
  const msg = results
    .flatMap((r) => r.messages)
    .find((m) => m.ruleId === 'design-system/no-unused-tokens');
  assert(msg);
  assert.equal(msg.severity, 'warn');
  assert.ok(msg.message.includes('#123456'));
});

void test('design-system/no-unused-tokens includes token metadata', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: { $type: 'string', $value: '#ffffff' },
      unused: {
        $type: 'string',
        $value: '#123456',
        $deprecated: { $replacement: '#/color/primary' },
        $extensions: { 'vendor.foo': true },
      },
    },
  };
  await ensureDtifFlattenedTokens(tokens, {
    uri: 'memory://tests/no-unused-tokens/default.json',
  });
  const linter = initLinter(
    {
      tokens,
      rules: { 'design-system/no-unused-tokens': 'warn' },
    },
    new FileSource(),
  );
  const doc: LintDocument = {
    id: 'file.ts',
    type: 'ts',
    getText: () => Promise.resolve('const color = "#ffffff";'),
  };
  const { results } = await linter.lintDocuments([doc]);
  const msg = results
    .flatMap((r) => r.messages)
    .find((m) => m.ruleId === 'design-system/no-unused-tokens');
  assert(msg);
  assert(msg.metadata);
  assert.equal(msg.metadata.path, 'color.unused');
  const { deprecated } = msg.metadata;
  assert(deprecated && typeof deprecated === 'object');
  assert('supersededBy' in deprecated);
  const supersededBy = deprecated.supersededBy;
  assert(
    supersededBy &&
      typeof supersededBy === 'object' &&
      'pointer' in supersededBy &&
      typeof supersededBy.pointer === 'string',
  );
  assert.equal(supersededBy.pointer, '#/color/primary');
  if ('uri' in supersededBy && typeof supersededBy.uri === 'string') {
    assert.equal(
      supersededBy.uri,
      'memory://tests/no-unused-tokens/default.json',
    );
  }
  assert.deepEqual(msg.metadata.extensions, { 'vendor.foo': true });
});

void test('design-system/no-unused-tokens passes when tokens used', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: { $type: 'string', $value: '#000000' },
    },
  };
  const linter = initLinter(
    {
      tokens,
      rules: { 'design-system/no-unused-tokens': 'error' },
    },
    new FileSource(),
  );
  const doc: LintDocument = {
    id: 'file.ts',
    type: 'ts',
    getText: () => Promise.resolve('const color = "#000000";'),
  };
  const { results } = await linter.lintDocuments([doc]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});

void test('design-system/no-unused-tokens can ignore tokens', async () => {
  const tokens = {
    $version: '1.0.0',
    color: {
      primary: { $type: 'string', $value: '#000000' },
      unused: { $type: 'string', $value: '#123456' },
    },
  };
  const linter = initLinter(
    {
      tokens,
      rules: {
        'design-system/no-unused-tokens': ['warn', { ignore: ['#123456'] }],
      },
    },
    new FileSource(),
  );
  const doc: LintDocument = {
    id: 'file.ts',
    type: 'ts',
    getText: () => Promise.resolve('const color = "#000000";'),
  };
  const { results } = await linter.lintDocuments([doc]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});

void test('design-system/no-unused-tokens matches hex case-insensitively', async () => {
  const tokens = {
    $version: '1.0.0',
    color: { primary: { $type: 'string', $value: '#abcdef' } },
  };
  const linter = initLinter(
    {
      tokens,
      rules: { 'design-system/no-unused-tokens': 'warn' },
    },
    new FileSource(),
  );
  const doc: LintDocument = {
    id: 'file.ts',
    type: 'ts',
    getText: () => Promise.resolve('const color = "#ABCDEF";'),
  };
  const { results } = await linter.lintDocuments([doc]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});
