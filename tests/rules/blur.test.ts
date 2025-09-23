import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const tokens = {
  $version: '1.0.0',
  blurs: {
    sm: {
      $type: 'dimension',
      $value: { dimensionType: 'length', value: 4, unit: 'px' },
    },
  },
};

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/blur': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/blur reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{filter:blur(2px);}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/blur accepts valid values', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{filter:blur(4px);}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/blur warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/blur': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('blurs'));
});
