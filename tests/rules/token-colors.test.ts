import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';

void test('design-token/colors reports disallowed hwb', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "hwb(0, 0%, 0%)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed lab', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "lab(0% 0 0)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed lch', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "lch(0% 0 0)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed color()', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "color(display-p3 1 0 0)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports template literal', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: `hwb(0, 0%, 0%)` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports template expression', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: `hwb(0, 0%, 0%) ${foo}` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors sets category', async () => {
  const linter = new Linter(
    {
      tokens: { colors: { primary: '#ffffff' } },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const c = <div style={{ color: "hwb(0, 0%, 0%)" }} />;',
    'file.tsx',
  );
  assert.equal(res.ruleCategories?.['design-token/colors'], 'design-token');
});

void test('design-token/colors allows variables with modes and aliases', async () => {
  const linter = new Linter(
    {
      tokens: {
        colors: ['--color-primary', '--color-secondary'],
        variables: {
          primary: {
            id: '--color-primary',
            modes: { light: '#fff', dark: '#000' },
          },
          secondary: {
            id: '--color-secondary',
            aliasOf: '--color-primary',
          },
        },
      },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{color:var(--color-secondary);}',
    'a.css',
  );
  assert.equal(res.messages.length, 0);
});
