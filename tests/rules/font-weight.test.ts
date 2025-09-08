import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/node-adapter/linter.ts';
import { FileSource } from '../../src/node-adapter/file-source.ts';

void test('design-token/font-weight reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { fontWeights: { regular: 400 } },
      rules: { 'design-token/font-weight': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{font-weight:500;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/font-weight accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: { fontWeights: { regular: 400, bold: '700' } },
      rules: { 'design-token/font-weight': 'error' },
    },
    new FileSource(),
  );
  const css = '.a{font-weight:400;} .b{font-weight:700;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/font-weight reports numeric literals', async () => {
  const linter = new Linter(
    {
      tokens: { fontWeights: { regular: 400 } },
      rules: { 'design-token/font-weight': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const w = <div style={{ fontWeight: 500 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/font-weight ignores numbers in JSX props', async () => {
  const linter = new Linter(
    {
      tokens: { fontWeights: { regular: 400 } },
      rules: { 'design-token/font-weight': 'error' },
    },
    new FileSource(),
  );
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/font-weight warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/font-weight': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.fontWeights'));
});
