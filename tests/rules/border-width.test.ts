import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const tokens = {
  borderWidths: {
    sm: {
      $type: 'dimension',
      $value: { dimensionType: 'length', value: 1, unit: 'px' },
    },
    md: {
      $type: 'dimension',
      $value: { dimensionType: 'length', value: 2, unit: 'px' },
    },
  },
};

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/border-width': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/border-width reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{border-width:3px;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width accepts valid values', async () => {
  const linter = createLinter();
  const css = '.a{border-width:1px;} .b{border-width:2px;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/border-width reports numeric literals', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const w = <div style={{ borderWidth: 3 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width reports template literal', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const w = <div style={{ borderWidth: `3` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width reports template expression', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const w = <div style={{ borderWidth: `3${"px"}` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width reports prefix unary', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const w = <div style={{ borderWidth: -3 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width ignores numbers in JSX props', async () => {
  const linter = createLinter();
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/border-width warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/border-width': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('borderWidths'));
});
