import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-token/animation reports invalid value', async () => {
  const linter = new Linter({
    tokens: { animations: { spin: 'spin 1s linear infinite' } },
    rules: { 'design-token/animation': 'error' },
  });
  const res = await linter.lintText(
    '.a{animation: wiggle 2s ease-in-out;}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

test('design-token/animation accepts valid values', async () => {
  const linter = new Linter({
    tokens: { animations: { spin: 'spin 1s linear infinite' } },
    rules: { 'design-token/animation': 'error' },
  });
  const res = await linter.lintText(
    '.a{animation: spin 1s linear infinite;}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

test('design-token/animation warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/animation': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('animations'));
});
