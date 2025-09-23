import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const tokens = {
  $version: '1.0.0',
  lineHeights: {
    base: { $type: 'number', $value: 1.5 },
    tight: { $type: 'number', $value: 2 },
  },
};

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/line-height': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/line-height reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{line-height:3;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height accepts valid values', async () => {
  const linter = createLinter();
  const css = '.a{line-height:1.5;} .b{line-height:2;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/line-height reports numeric literals', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const lh = <div style={{ lineHeight: 3 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height reports template literal', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const lh = <div style={{ lineHeight: `3` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height reports template expression', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const lh = <div style={{ lineHeight: `2${"px"}` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height reports prefix unary', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const lh = <div style={{ lineHeight: -2 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height ignores numbers in JSX props', async () => {
  const linter = createLinter();
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/line-height warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/line-height': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('line height tokens'));
});
