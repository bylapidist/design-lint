import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const tokens = {
  fonts: { $type: 'fontFamily', sans: { $value: 'Inter' } },
};

function createLinter() {
  return initLinter(
    {
      tokens,
      rules: { 'design-token/font-family': 'error' },
    },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/font-family reports invalid font-family', async () => {
  const linter = createLinter();
  const css = `.a{\n  font-family:\n    'Inter',\n    Arial;\n}`;
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/font-family warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/font-family': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.css');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('font tokens'));
});
