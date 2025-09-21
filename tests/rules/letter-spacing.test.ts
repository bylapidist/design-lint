import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

const tokens = {
  letterSpacings: {
    $type: 'dimension',
    tight: { $value: { dimensionType: 'length', value: -0.05, unit: 'rem' } },
    none: { $value: { dimensionType: 'length', value: 0, unit: 'rem' } },
  },
};

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/letter-spacing': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/letter-spacing reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{letter-spacing:2px;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/letter-spacing accepts valid values', async () => {
  const linter = createLinter();
  const css = '.a{letter-spacing:-0.05em;} .b{letter-spacing:0;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/letter-spacing reports numeric literals', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const ls = <div style={{ letterSpacing: 2 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/letter-spacing ignores numbers in JSX props', async () => {
  const linter = createLinter();
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/letter-spacing warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/letter-spacing': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('letter-spacing tokens'));
});
