import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';
import { registerTokenValidator } from '../../src/core/token-validators/index.ts';

registerTokenValidator('string', () => undefined);

const tokens = {
  outlines: { $type: 'string', focus: { $value: '2px solid #000' } },
};

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/outline': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/outline reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{outline:3px solid #000;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/outline accepts valid values', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{outline:2px solid #000;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/outline warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/outline': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('outlines'));
});
