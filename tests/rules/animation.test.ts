import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';
import { registerTokenValidator } from '../../src/core/token-validators/index.ts';

registerTokenValidator('string', () => {});

const tokens = {
  animations: {
    $type: 'string',
    spin: { $value: 'spin 1s linear infinite' },
  },
};

function createLinter() {
  return new Linter(
    { tokens, rules: { 'design-token/animation': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
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
  const linter = new Linter(
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
