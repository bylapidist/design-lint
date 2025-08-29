import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-token/z-index reports invalid value', async () => {
  const linter = new Linter({
    tokens: { zIndex: { modal: 100 } },
    rules: { 'design-token/z-index': 'error' },
  });
  const res = await linter.lintText('.a{z-index:5;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/z-index accepts valid values', async () => {
  const linter = new Linter({
    tokens: { zIndex: { modal: 100 } },
    rules: { 'design-token/z-index': 'error' },
  });
  const res = await linter.lintText('.a{z-index:100;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

test('design-token/z-index reports numeric literals', async () => {
  const linter = new Linter({
    tokens: { zIndex: { modal: 100 } },
    rules: { 'design-token/z-index': 'error' },
  });
  const res = await linter.lintText('const z = 5;', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/z-index warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/z-index': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('zIndex'));
});
