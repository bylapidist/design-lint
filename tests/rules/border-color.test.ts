import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';

void test('design-token/border-color reports invalid value', async () => {
  const tokens = {
    borderColors: { $type: 'color', primary: { $value: '#ffffff' } },
  };
  const linter = initLinter(
    { tokens, rules: { 'design-token/border-color': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
  const res = await linter.lintText('.a{border-color:#000000;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-color accepts valid values', async () => {
  const tokens = {
    borderColors: { $type: 'color', primary: { $value: '#ffffff' } },
  };
  const linter = initLinter(
    { tokens, rules: { 'design-token/border-color': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
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
