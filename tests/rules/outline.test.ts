import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-token/outline reports invalid value', async () => {
  const linter = new Linter({
    tokens: { outlines: { focus: '2px solid #000' } },
    rules: { 'design-token/outline': 'error' },
  });
  const res = await linter.lintText('.a{outline:3px solid #000;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/outline accepts valid values', async () => {
  const linter = new Linter({
    tokens: { outlines: { focus: '2px solid #000' } },
    rules: { 'design-token/outline': 'error' },
  });
  const res = await linter.lintText('.a{outline:2px solid #000;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

test('design-token/outline warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/outline': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('outlines'));
});
