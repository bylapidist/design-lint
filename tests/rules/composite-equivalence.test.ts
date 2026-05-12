import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { ConfigTokenProvider } from '../../src/config/config-token-provider.js';
import { createDtifTheme } from '../helpers/dtif.js';

const tokens = createDtifTheme({
  'border.primary': {
    type: 'border',
    value: '1px solid #3B82F6',
  },
  'shadow.sm': {
    type: 'boxShadow',
    value: '0 1px 3px rgba(0,0,0,0.1)',
  },
});

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/composite-equivalence': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new ConfigTokenProvider({ tokens }),
    },
  );
}

void test('design-token/composite-equivalence reports a raw value matching a border token', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { border: 1px solid #3B82F6; }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('composite token'));
});

void test('design-token/composite-equivalence reports case-insensitive match', async () => {
  const linter = createLinter();
  // Token value is "1px solid #3B82F6"; CSS value with different casing should still match
  const res = await linter.lintText(
    'a { border: 1px solid #3b82f6; }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/composite-equivalence does not report a non-matching value', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { border: 2px dashed red; }',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/composite-equivalence does nothing when no composite tokens provided', async () => {
  const linter = initLinter(
    { rules: { 'design-token/composite-equivalence': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new ConfigTokenProvider({}),
    },
  );
  const res = await linter.lintText(
    'a { border: 1px solid red; box-shadow: 0 1px 3px black; }',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/composite-equivalence ignores non-CSS files', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'const x = "1px solid #3B82F6";',
    'file.ts',
  );
  assert.equal(res.messages.length, 0);
});
