import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';
import { createDtifTheme } from '../helpers/dtif.js';

function createLinter(rule: unknown = 'error') {
  const tokens = createDtifTheme({
    'colors.primary': { type: 'color', value: '#ffffff' },
  });
  return initLinter(
    { tokens, rules: { 'design-token/colors': rule } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(tokens),
    },
  );
}

void test('design-token/colors allows token-equivalent literal in legacy mode', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: "#ffffff" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/colors reports token-equivalent literal in strict mode', async () => {
  const linter = createLinter(['error', { strictReference: true }]);
  const res = await linter.lintText(
    'const c = <div style={{ color: "#ffffff" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/colors allows CSS variable references in strict mode', async () => {
  const linter = createLinter(['error', { strictReference: true }]);
  const res = await linter.lintText(
    '.button { color: var(--colors-primary); }',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});
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
