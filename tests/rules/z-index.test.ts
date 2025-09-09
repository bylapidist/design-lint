import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';

void test('design-token/z-index reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { zIndex: { modal: 100 } },
      rules: { 'design-token/z-index': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{z-index:5;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/z-index accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: { zIndex: { modal: 100 } },
      rules: { 'design-token/z-index': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{z-index:100;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/z-index reports numeric literals', async () => {
  const linter = new Linter(
    {
      tokens: { zIndex: { modal: 100 } },
      rules: { 'design-token/z-index': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const z = <div style={{ zIndex: 5 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/z-index ignores numbers in JSX props', async () => {
  const linter = new Linter(
    {
      tokens: { zIndex: { modal: 100 } },
      rules: { 'design-token/z-index': 'error' },
    },
    new FileSource(),
  );
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/z-index warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/z-index': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('zIndex'));
});
