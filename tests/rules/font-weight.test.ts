import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';

const tokens = {
  fontWeights: {
    $type: 'fontWeight',
    regular: { $value: 400 },
    bold: { $value: '700' },
  },
};

function createLinter() {
  return new Linter(
    { tokens, rules: { 'design-token/font-weight': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/font-weight reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{font-weight:500;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/font-weight accepts valid values', async () => {
  const linter = createLinter();
  const css = '.a{font-weight:400;} .b{font-weight:700;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/font-weight reports numeric literals', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const w = <div style={{ fontWeight: 500 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/font-weight ignores numbers in JSX props', async () => {
  const linter = createLinter();
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/font-weight warns when tokens missing', async () => {
  const linter = new Linter(
    { rules: { 'design-token/font-weight': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('font weight tokens'));
});
