import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';

function createLinter(rule: unknown = 'error') {
  const tokens = {
    palette: {
      neutral: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 1, 1] },
      },
      accent: {
        $type: 'color',
        $value: { colorSpace: 'display-p3', components: [1, 0, 0] },
      },
    },
  } as const;
  return initLinter(
    { tokens, rules: { 'design-token/colors': rule } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider({ default: tokens }),
    },
  );
}

void test('design-token/colors allows declared rgb tokens', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: "rgb(255, 255, 255)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/colors allows declared color() tokens', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const c = <div style={{ color: "color(display-p3 1 0 0)" }} />;',
    'file.tsx',
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
    'const c = <div style={{ color: "color(display-p3 0 1 0)" }} />;',
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
