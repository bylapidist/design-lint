import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.ts';

function createLinter(rule: unknown = 'error') {
  const tokens = { colors: { $type: 'color', primary: { $value: '#ffffff' } } };
  return new Linter(
    { tokens, rules: { 'design-token/colors': rule } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/colors reports disallowed hwb', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: "hwb(0, 0%, 0%)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed lab', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: "lab(0% 0 0)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed lch', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: "lch(0% 0 0)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports disallowed color()', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: "color(display-p3 1 0 0)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports template literal', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: `hwb(0, 0%, 0%)` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors reports template expression', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: `hwb(0, 0%, 0%) ${foo}` }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors sets category', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: "hwb(0, 0%, 0%)" }} />;',
    'file.tsx',
  );
  assert.equal(res.ruleCategories?.['design-token/colors'], 'design-token');
});
