import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';
import { createDtifTheme } from '../helpers/dtif.js';

// The easing rule's getAllowed only collects string-valued cubicBezier tokens,
// so we must supply a string value to get a non-empty allowed set and reach
// the rule's `create` code path.
const tokens = createDtifTheme({
  'easing.standard': {
    type: 'cubicBezier',
    value: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
});

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/easing': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(tokens),
    },
  );
}

void test('design-token/easing reports a cubic-bezier value not in the token set', async () => {
  const linter = createLinter();
  // cubic-bezier(0.25, 0.1, 0.25, 1) is not the token value — should be flagged
  const res = await linter.lintText(
    'a { animation-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1); }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('Unexpected easing value'));
});

void test('design-token/easing accepts the exact allowed cubic-bezier token value', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/easing reports steps() value', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { animation-timing-function: steps(4, end); }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/easing reports step-start keyword', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { transition-timing-function: step-start; }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/easing reports step-end keyword', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { transition-timing-function: step-end; }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/easing reports easing in animation shorthand', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { animation: slide 300ms cubic-bezier(0.25, 0.1, 0.25, 1); }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/easing ignores non-timing-function properties', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { color: red; margin: 8px; }',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/easing warns when no cubicBezier tokens provided', async () => {
  const linter = initLinter(
    { rules: { 'design-token/easing': 'warn' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText('', 'file.css');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('cubicBezier'));
});
