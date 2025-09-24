import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import type { LintDocument } from '../../src/core/environment.js';
import type { TokenDeprecation } from '../../src/core/types.js';

interface TokenMetadataDetails {
  path: string;
  pointer: string;
  deprecated?: TokenDeprecation;
  extensions: Record<string, unknown>;
}

function assertTokenMetadata(
  value: unknown,
): asserts value is TokenMetadataDetails {
  assert.ok(isRecord(value), 'Expected metadata to be an object');
  assert.strictEqual(typeof value.path, 'string');
  assert.strictEqual(typeof value.pointer, 'string');
  assert.ok(isRecord(value.extensions));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
      unused: {
        $type: 'string',
        $value: '#123456',
        $deprecated: { $replacement: '#/color/primary' },
        $extensions: { 'vendor.foo': true },
      },
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
    getText: () => Promise.resolve(''),
  };
  const { results } = await linter.lintDocuments([doc]);
  const msg = results
    .flatMap((r) => r.messages)
    .find((m) => m.ruleId === 'design-system/no-unused-tokens');
  assert(msg);
  assertTokenMetadata(msg.metadata);
  assert.equal(msg.metadata.path, 'color.unused');
  assert.equal(msg.metadata.pointer, '#/color/unused');
  const deprecated = msg.metadata.deprecated;
  assert(deprecated);
  const superseded = deprecated.supersededBy;
  assert(superseded);
  assert.equal(superseded.pointer, '#/color/primary');
  assert.equal(superseded.uri, 'memory://inline-config/default.json');
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
