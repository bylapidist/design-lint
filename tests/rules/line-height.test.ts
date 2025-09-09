import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/node/file-source.ts';

void test('design-token/line-height reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { lineHeights: { base: 1.5 } },
      rules: { 'design-token/line-height': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{line-height:2;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: {
        lineHeights: { base: 1.5, tight: '20px' },
      },
      rules: { 'design-token/line-height': 'error' },
    },
    new FileSource(),
  );
  const css = '.a{line-height:1.5;} .b{line-height:20px;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/line-height reports numeric literals', async () => {
  const linter = new Linter(
    {
      tokens: { lineHeights: { base: 1.5 } },
      rules: { 'design-token/line-height': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const lh = <div style={{ lineHeight: 2 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height reports template literal', async () => {
  const linter = new Linter(
    {
      tokens: { lineHeights: { base: 1.5 } },
      rules: { 'design-token/line-height': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const lh = <div style={{ lineHeight: `2` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height reports template expression', async () => {
  const linter = new Linter(
    {
      tokens: { lineHeights: { base: 1.5 } },
      rules: { 'design-token/line-height': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const lh = <div style={{ lineHeight: `2${"px"}` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height reports prefix unary', async () => {
  const linter = new Linter(
    {
      tokens: { lineHeights: { base: 1.5 } },
      rules: { 'design-token/line-height': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const lh = <div style={{ lineHeight: -2 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/line-height ignores numbers in JSX props', async () => {
  const linter = new Linter(
    {
      tokens: { lineHeights: { base: 1.5 } },
      rules: { 'design-token/line-height': 'error' },
    },
    new FileSource(),
  );
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/line-height warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/line-height': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.lineHeights'));
});
