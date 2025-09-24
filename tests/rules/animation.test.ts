import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';
import { registerTokenValidator } from '../../src/core/token-validators/index.js';
import { createDtifTheme } from '../helpers/dtif.js';

registerTokenValidator('string', () => undefined);

const tokens = createDtifTheme({
  'animations.spin': { type: 'string', value: 'spin 1s linear infinite' },
});

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/animation': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(tokens),
    },
  );
}

void test('design-token/animation reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    '.a{animation: wiggle 2s ease-in-out;}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/animation accepts valid values', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    '.a{animation: spin 1s linear infinite;}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/animation warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/animation': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('animations'));
});
