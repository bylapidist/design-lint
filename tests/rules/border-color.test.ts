import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const borderColorTokens = {
  $version: '1.0.0',
  borderColors: {
    primary: {
      $type: 'color',
      $value: {
        colorSpace: 'srgb',
        components: [1, 1, 1],
      },
    },
  },
} as const;

void test('design-token/border-color reports invalid value', async () => {
  const linter = initLinter(
    {
      tokens: borderColorTokens,
      rules: { 'design-token/border-color': 'error' },
    },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: borderColorTokens }),
    },
  );
  const res = await linter.lintText('.a{border-color:#000000;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-color accepts valid values', async () => {
  const linter = initLinter(
    {
      tokens: borderColorTokens,
      rules: { 'design-token/border-color': 'error' },
    },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: borderColorTokens }),
    },
  );
  const res = await linter.lintText('.a{border-color:#ffffff;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/border-color warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/border-color': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('color tokens'));
});
