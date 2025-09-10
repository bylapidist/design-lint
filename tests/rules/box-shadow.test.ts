import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';

const tokens = {
  shadows: {
    $type: 'shadow',
    sm: {
      $value: {
        offsetX: '0px',
        offsetY: '1px',
        blur: '2px',
        color: 'rgba(0,0,0,0.1)',
      },
    },
    lg: {
      $value: {
        offsetX: '0px',
        offsetY: '2px',
        blur: '4px',
        color: 'rgba(0,0,0,0.2)',
      },
    },
  },
};

function createLinter() {
  return new Linter(
    { tokens, rules: { 'design-token/box-shadow': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/box-shadow reports disallowed value', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    '.a{box-shadow:0px 2px 4px rgba(0,0,0,0.1);}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/box-shadow allows configured tokens', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    '.a{box-shadow:0px 1px 2px rgba(0,0,0,0.1), 0px 2px 4px rgba(0,0,0,0.2);}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/box-shadow warns when tokens missing', async () => {
  const linter = new Linter(
    { rules: { 'design-token/box-shadow': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('shadow tokens'));
});
