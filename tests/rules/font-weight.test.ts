import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-token/font-weight reports invalid value', async () => {
  const linter = new Linter({
    tokens: { fontWeights: { regular: 400 } },
    rules: { 'design-token/font-weight': 'error' },
  });
  const res = await linter.lintText('.a{font-weight:500;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/font-weight accepts valid values', async () => {
  const linter = new Linter({
    tokens: { fontWeights: { regular: 400, bold: '700' } },
    rules: { 'design-token/font-weight': 'error' },
  });
  const css = '.a{font-weight:400;} .b{font-weight:700;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

test('design-token/font-weight reports numeric literals', async () => {
  const linter = new Linter({
    tokens: { fontWeights: { regular: 400 } },
    rules: { 'design-token/font-weight': 'error' },
  });
  const res = await linter.lintText('const w = 500;', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/font-weight warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/font-weight': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.fontWeights'));
});
