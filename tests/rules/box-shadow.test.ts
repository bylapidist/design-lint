import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const tokens = {
  shadows: {
    $type: 'shadow',
    sm: {
      $value: {
        offsetX: { dimensionType: 'length', value: 0, unit: 'px' },
        offsetY: { dimensionType: 'length', value: 1, unit: 'px' },
        blur: { dimensionType: 'length', value: 2, unit: 'px' },
        spread: { dimensionType: 'length', value: 0, unit: 'px' },
        color: 'rgba(0,0,0,0.1)',
      },
    },
    lg: {
      $value: {
        offsetX: { dimensionType: 'length', value: 0, unit: 'px' },
        offsetY: { dimensionType: 'length', value: 2, unit: 'px' },
        blur: { dimensionType: 'length', value: 4, unit: 'px' },
        spread: { dimensionType: 'length', value: 0, unit: 'px' },
        color: 'rgba(0,0,0,0.2)',
      },
    },
  },
};

function createLinter() {
  return initLinter(
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
    '.a{box-shadow:0px 2px 4px 0px rgba(0,0,0,0.1);}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/box-shadow allows configured tokens', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    '.a{box-shadow:0px 1px 2px 0px rgba(0,0,0,0.1), 0px 2px 4px 0px rgba(0,0,0,0.2);}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/box-shadow warns when tokens missing', async () => {
  const linter = initLinter(
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
