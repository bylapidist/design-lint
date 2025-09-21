import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

function createLinter(rule: unknown = 'error') {
  const tokens = { opacity: { low: { $type: 'number', $value: 0.2 } } };
  return initLinter(
    { tokens, rules: { 'design-token/opacity': rule } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/opacity reports invalid value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{opacity:0.5;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/opacity reports zero value', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{opacity:0;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/opacity accepts valid values', async () => {
  const linter = createLinter();
  const res = await linter.lintText('.a{opacity:0.2;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/opacity reports numeric literals', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const o = <div style={{ opacity: 0.5 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/opacity ignores numbers in JSX props', async () => {
  const linter = createLinter();
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/opacity warns when tokens missing', async () => {
  const linter = initLinter(
    { rules: { 'design-token/opacity': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({}),
    },
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('opacity'));
});
