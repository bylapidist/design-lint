import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/node-adapter/linter.ts';
import { FileSource } from '../../src/node-adapter/file-source.ts';

void test('design-token/colors reports disallowed hex', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "#AaBbCc" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'design-token/colors');
});

void test('design-token/colors ignores hex case', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#FFFFFF' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "#ffffff" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/colors ignores invalid hex lengths', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#fff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "#12345" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/colors reports disallowed rgb', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "rgb(0, 0, 0)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed rgba', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "rgba(0,0,0,0.5)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed hsl', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "hsl(0, 0%, 0%)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed hsla', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "hsla(0, 0%, 0%, 0.5)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed named color', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "red" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports correct column for mid-string color', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "abc #000" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].column > 0);
});

void test('design-token/colors reports various named colors', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <div style={{ color: "papayawhip" }} />; const b = <div style={{ color: "rebeccapurple" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 2);
});

void test('design-token/colors reports correct column for css declarations', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('background:url(foo) #000;', 'file.css');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].column, 10);
});

void test('design-token/colors allows configured formats', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': ['error', { allow: ['named'] }] },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "red" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/colors handles gradients', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const css = `.a{\n  background: linear-gradient(\n    #ffffff,\n    #000000\n  );\n}`;
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/colors': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.colors'));
});

void test('design-token/colors ignores non-style jsx attributes', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const a = <div aria-label="Pause audio" style={{ color: "#000" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'design-token/colors');
});
