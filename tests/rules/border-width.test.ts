import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/node-adapter/linter.ts';
import { FileSource } from '../../src/node-adapter/file-source.ts';

void test('design-token/border-width reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { borderWidths: { sm: 1, md: 2 } },
      rules: { 'design-token/border-width': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{border-width:3px;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: { borderWidths: { sm: 1, md: 2 } },
      rules: { 'design-token/border-width': 'error' },
    },
    new FileSource(),
  );
  const css = '.a{border-width:1px;} .b{border-width:2px;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/border-width reports numeric literals', async () => {
  const linter = new Linter(
    {
      tokens: { borderWidths: { sm: 1, md: 2 } },
      rules: { 'design-token/border-width': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const w = <div style={{ borderWidth: 3 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width reports template literal', async () => {
  const linter = new Linter(
    {
      tokens: { borderWidths: { sm: 1, md: 2 } },
      rules: { 'design-token/border-width': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const w = <div style={{ borderWidth: `3` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width reports template expression', async () => {
  const linter = new Linter(
    {
      tokens: { borderWidths: { sm: 1, md: 2 } },
      rules: { 'design-token/border-width': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const w = <div style={{ borderWidth: `3${"px"}` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width reports prefix unary', async () => {
  const linter = new Linter(
    {
      tokens: { borderWidths: { sm: 1, md: 2 } },
      rules: { 'design-token/border-width': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const w = <div style={{ borderWidth: -3 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-width ignores numbers in JSX props', async () => {
  const linter = new Linter(
    {
      tokens: { borderWidths: { sm: 1, md: 2 } },
      rules: { 'design-token/border-width': 'error' },
    },
    new FileSource(),
  );
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/border-width warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/border-width': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('borderWidths'));
});
