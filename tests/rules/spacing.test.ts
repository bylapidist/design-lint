import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/node/file-source.ts';

void test('design-token/spacing enforces multiples', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const s = <div style={{ margin: 5 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/spacing reports template literal', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const s = <div style={{ margin: `5` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/spacing reports template expression', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const s = <div style={{ margin: `5${"px"}` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/spacing reports prefix unary', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const s = <div style={{ margin: -5 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/spacing handles multi-line CSS', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const css = `.a{\n  margin:\n    0.5rem\n    8px\n    10vw;\n}`;
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/spacing ignores unsupported units', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{margin:5.5vw 10%;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/spacing ignores calc() values', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{margin:calc(100% - 5px);}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/spacing ignores var() fallbacks', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{margin:var(--m, 5px);}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/spacing ignores numbers in JSX props', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/spacing ignores nested functions', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{margin:calc(var(--m, 5px) + 4px);}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/spacing ignores nested var() fallbacks', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4 }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{margin:var(--m, var(--n, 5px));}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/spacing supports custom units', async () => {
  const linter = new Linter(
    {
      tokens: { spacing: { sm: 4, md: 8 } },
      rules: { 'design-token/spacing': ['error', { base: 4, units: ['vw'] }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{margin:5vw;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/spacing warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/spacing': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.spacing'));
});
