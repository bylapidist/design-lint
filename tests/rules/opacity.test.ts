import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-token/opacity reports invalid value', async () => {
  const linter = new Linter({
    tokens: { opacity: { low: 0.2 } },
    rules: { 'design-token/opacity': 'error' },
  });
  const res = await linter.lintText('.a{opacity:0.5;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/opacity reports zero value', async () => {
  const linter = new Linter({
    tokens: { opacity: { low: 0.2 } },
    rules: { 'design-token/opacity': 'error' },
  });
  const res = await linter.lintText('.a{opacity:0;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/opacity accepts valid values', async () => {
  const linter = new Linter({
    tokens: { opacity: { low: 0.2 } },
    rules: { 'design-token/opacity': 'error' },
  });
  const res = await linter.lintText('.a{opacity:0.2;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

test('design-token/opacity reports numeric literals', async () => {
  const linter = new Linter({
    tokens: { opacity: { low: 0.2 } },
    rules: { 'design-token/opacity': 'error' },
  });
  const res = await linter.lintText('const o = 0.5;', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/opacity warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/opacity': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('opacity'));
});
