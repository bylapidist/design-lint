import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/node-adapter/linter.ts';
import { FileSource } from '../../src/node-adapter/file-source.ts';

void test('design-token/opacity reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { opacity: { low: 0.2 } },
      rules: { 'design-token/opacity': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{opacity:0.5;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/opacity reports zero value', async () => {
  const linter = new Linter(
    {
      tokens: { opacity: { low: 0.2 } },
      rules: { 'design-token/opacity': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{opacity:0;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/opacity accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: { opacity: { low: 0.2 } },
      rules: { 'design-token/opacity': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{opacity:0.2;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/opacity reports numeric literals', async () => {
  const linter = new Linter(
    {
      tokens: { opacity: { low: 0.2 } },
      rules: { 'design-token/opacity': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const o = <div style={{ opacity: 0.5 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/opacity ignores numbers in JSX props', async () => {
  const linter = new Linter(
    {
      tokens: { opacity: { low: 0.2 } },
      rules: { 'design-token/opacity': 'error' },
    },
    new FileSource(),
  );
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/opacity warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/opacity': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('opacity'));
});
