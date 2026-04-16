import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { ConfigTokenProvider } from '../../src/config/config-token-provider.js';

function createLinter() {
  return initLinter(
    { rules: { 'design-system/jsx-style-values': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new ConfigTokenProvider({}),
    },
  );
}

void test('design-system/jsx-style-values reports raw string color in JSX style', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div style={{ color: "#3B82F6" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('Raw style value'));
});

void test('design-system/jsx-style-values reports raw numeric value in JSX style', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div style={{ margin: 16 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('Raw numeric value'));
});

void test('design-system/jsx-style-values accepts token reference (var(--...))', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div style={{ color: "var(--color-brand-primary)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/jsx-style-values accepts numeric zero', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div style={{ margin: 0 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/jsx-style-values accepts empty string value', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div style={{ content: "" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/jsx-style-values accepts "inherit" and "initial"', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div style={{ color: "inherit", display: "initial" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/jsx-style-values ignores non-style attributes', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div className="foo" id="bar" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/jsx-style-values ignores non-JSX files', async () => {
  const linter = createLinter();
  const res = await linter.lintText('a { color: red; }', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-system/jsx-style-values reports multiple violations', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div style={{ color: "#fff", margin: 8 }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 2);
});

void test('design-system/jsx-style-values ignores style attribute without object literal', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const styles = { color: "#fff" }; const C = () => <div style={styles} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/jsx-style-values accepts var( -- ) with space', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const C = () => <div style={{ color: "var( --color-primary)" }} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});
