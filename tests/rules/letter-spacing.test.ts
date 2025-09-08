import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../packages/core/src/core/linter.ts';
import { FileSource } from '../../packages/core/src/core/file-source.ts';

void test('design-token/letter-spacing reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { letterSpacings: { tight: '-0.05em' } },
      rules: { 'design-token/letter-spacing': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{letter-spacing:2px;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/letter-spacing accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: {
        letterSpacings: { tight: '-0.05em', none: 0 },
      },
      rules: { 'design-token/letter-spacing': 'error' },
    },
    new FileSource(),
  );
  const css = '.a{letter-spacing:-0.05em;} .b{letter-spacing:0;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/letter-spacing reports numeric literals', async () => {
  const linter = new Linter(
    {
      tokens: { letterSpacings: { none: 0 } },
      rules: { 'design-token/letter-spacing': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    'const ls = <div style={{ letterSpacing: 2 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/letter-spacing ignores numbers in JSX props', async () => {
  const linter = new Linter(
    {
      tokens: { letterSpacings: { none: 0 } },
      rules: { 'design-token/letter-spacing': 'error' },
    },
    new FileSource(),
  );
  const code = 'export const C = () => <Component headingLevel={2} />;';
  const res = await linter.lintText(code, 'file.tsx');
  assert.equal(res.messages.length, 0);
});

void test('design-token/letter-spacing warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/letter-spacing': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.letterSpacings'));
});
