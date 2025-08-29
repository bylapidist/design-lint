import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/engine';

test('design-token/spacing enforces multiples', async () => {
  const linter = new Linter({
    tokens: { spacing: { sm: 4, md: 8 } },
    rules: { 'design-token/spacing': ['error', { base: 4 }] },
  });
  const res = await linter.lintText('const s = 5;', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/spacing handles multi-line CSS', async () => {
  const linter = new Linter({
    tokens: { spacing: { sm: 4, md: 8 } },
    rules: { 'design-token/spacing': ['error', { base: 4 }] },
  });
  const css = `.a{\n  margin:\n    0.5rem\n    8px\n    10vw;\n}`;
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/spacing ignores unsupported units', async () => {
  const linter = new Linter({
    tokens: { spacing: { sm: 4, md: 8 } },
    rules: { 'design-token/spacing': ['error', { base: 4 }] },
  });
  const res = await linter.lintText('.a{margin:5.5vw 10%;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

test('design-token/spacing supports custom units', async () => {
  const linter = new Linter({
    tokens: { spacing: { sm: 4, md: 8 } },
    rules: { 'design-token/spacing': ['error', { base: 4, units: ['vw'] }] },
  });
  const res = await linter.lintText('.a{margin:5vw;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/spacing warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/spacing': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.spacing'));
});
