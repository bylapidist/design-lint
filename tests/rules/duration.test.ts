import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-token/duration reports invalid transition duration', async () => {
  const linter = new Linter({
    tokens: { durations: { fast: '200ms' } },
    rules: { 'design-token/duration': 'error' },
  });
  const res = await linter.lintText(
    '.a{transition: all 300ms ease;}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

test('design-token/duration reports invalid animation duration', async () => {
  const linter = new Linter({
    tokens: { durations: { fast: '200ms' } },
    rules: { 'design-token/duration': 'error' },
  });
  const res = await linter.lintText(
    '.a{animation: fade 300ms linear;}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

test('design-token/duration accepts valid values', async () => {
  const linter = new Linter({
    tokens: { durations: { fast: '200ms', slow: 400 } },
    rules: { 'design-token/duration': 'error' },
  });
  const css =
    '.a{transition: all 200ms ease;} .b{animation: fade 400ms linear;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 0);
});

test('design-token/duration reports numeric literals', async () => {
  const linter = new Linter({
    tokens: { durations: { fast: '200ms' } },
    rules: { 'design-token/duration': 'error' },
  });
  const res = await linter.lintText('const d = 300;', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/duration warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/duration': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('durations'));
});
