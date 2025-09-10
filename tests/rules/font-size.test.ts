import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';

const tokens = {
  fontSizes: {
    $type: 'dimension',
    base: { $value: '16px' },
    lg: { $value: '32px' },
  },
};

function createLinter() {
  return new Linter(
    {
      tokens,
      rules: { 'design-token/font-size': 'error' },
    },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/font-size reports invalid font-size', async () => {
  const linter = createLinter();
  const css = '.a{font-size:20px;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/font-size accepts unit-based font-sizes', async () => {
  const linter = createLinter();
  const valid = await linter.lintText(
    '.a{font-size:16px;} .b{font-size:32px;}',
    'file.css',
  );
  assert.equal(valid.messages.length, 0);
  const invalid = await linter.lintText('.c{font-size:3rem;}', 'file.css');
  assert.equal(invalid.messages.length, 1);
});

void test('design-token/font-size warns when tokens missing', async () => {
  const linter = new Linter(
    { rules: { 'design-token/font-size': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.css');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('font size tokens'));
});
