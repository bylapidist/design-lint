import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import type { LintDocument } from '../../src/core/environment.js';

void test('design-system/no-unused-tokens reports unused tokens', async () => {
  const tokens = {
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
      unused: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0x12 / 0xff, 0x34 / 0xff, 0x56 / 0xff],
        },
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
    color: {
      unused: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0x12 / 0xff, 0x34 / 0xff, 0x56 / 0xff],
        },
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
  assert(msg.metadata);
  assert.equal(msg.metadata.path, 'color.unused');
  assert.equal(msg.metadata.deprecated, '#/color/primary');
  assert.deepEqual(msg.metadata.extensions, { 'vendor.foo': true });
});

void test('design-system/no-unused-tokens passes when tokens used', async () => {
  const tokens = {
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
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
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
      },
      unused: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0x12 / 0xff, 0x34 / 0xff, 0x56 / 0xff],
        },
      },
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
    color: {
      primary: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0xab / 0xff, 0xcd / 0xff, 0xef / 0xff],
        },
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
    getText: () => Promise.resolve('const color = "#ABCDEF";'),
  };
  const { results } = await linter.lintDocuments([doc]);
  const has = results.some((r) =>
    r.messages.some((m) => m.ruleId === 'design-system/no-unused-tokens'),
  );
  assert.equal(has, false);
});
