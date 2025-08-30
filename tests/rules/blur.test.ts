import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-token/blur reports invalid value', async () => {
  const linter = new Linter({
    tokens: { blurs: { sm: '4px' } },
    rules: { 'design-token/blur': 'error' },
  });
  const res = await linter.lintText('.a{filter:blur(2px);}', 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/blur accepts valid values', async () => {
  const linter = new Linter({
    tokens: { blurs: { sm: '4px' } },
    rules: { 'design-token/blur': 'error' },
  });
  const res = await linter.lintText('.a{filter:blur(4px);}', 'file.css');
  assert.equal(res.messages.length, 0);
});

test('design-token/blur warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/blur': 'warn' },
  });
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('blurs'));
});
