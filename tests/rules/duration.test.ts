import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';

const tokens = {
  durations: {
    $type: 'duration',
    fast: { $value: '200ms' },
    slow: { $value: '400ms' },
  },
};

function createLinter() {
  return new Linter(
    { tokens, rules: { 'design-token/duration': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/duration reports invalid transition duration', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    '.a{transition: all 300ms ease;}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/duration reports invalid animation duration', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    '.a{animation: fade 300ms linear;}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/duration accepts valid values', async () => {
  const linter = createLinter();
  const css =
    '.a{transition: all 200ms ease;} .b{animation: fade 400ms linear;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/duration reports numeric literals', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const d = <div style={{ animationDuration: 300 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/duration ignores numbers in JSX props', async () => {
  const linter = createLinter();
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/duration warns when tokens missing', async () => {
  const linter = new Linter(
    { rules: { 'design-token/duration': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('durations'));
});
