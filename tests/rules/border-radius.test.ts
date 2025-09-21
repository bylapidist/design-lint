import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const tokens = {
  radius: {
    sm: {
      $type: 'dimension',
      $value: { dimensionType: 'length', value: 2, unit: 'px' },
    },
    md: {
      $type: 'dimension',
      $value: { dimensionType: 'length', value: 4, unit: 'px' },
    },
  },
};

function createLinter(rule: unknown = 'error') {
  return initLinter(
    { tokens, rules: { 'design-token/border-radius': rule } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/border-radius reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{border-radius:3px;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-radius accepts valid values', async () => {
  const linter = createLinter();
  const css = '.a{border-radius:4px;} .b{border-radius:2px;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/border-radius reports numeric literals', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const r = <div style={{ borderRadius: 3 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-radius ignores numbers in JSX props', async () => {
  const linter = createLinter();
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/border-radius warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/border-radius': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('$type "dimension"'));
});
