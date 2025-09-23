import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const length = (value: number) => ({
  dimensionType: 'length' as const,
  value,
  unit: 'px',
});

const srgb = (alpha: number) => ({
  colorSpace: 'srgb' as const,
  components: [0, 0, 0],
  ...(alpha < 1 ? { alpha } : {}),
  hex: '#000000',
});

const tokens = {
  shadows: {
    sm: {
      $type: 'shadow',
      $value: {
        shadowType: 'css.box-shadow',
        offsetX: length(0),
        offsetY: length(1),
        blur: length(2),
        spread: length(0),
        color: srgb(0.1),
      },
    },
    lg: {
      $type: 'shadow',
      $value: {
        shadowType: 'css.box-shadow',
        offsetX: length(0),
        offsetY: length(2),
        blur: length(4),
        spread: length(0),
        color: srgb(0.2),
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
