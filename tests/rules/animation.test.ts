import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../packages/core/src/core/linter.ts';
import { FileSource } from '../../packages/core/src/core/file-source.ts';

void test('design-token/animation reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { animations: { spin: 'spin 1s linear infinite' } },
      rules: { 'design-token/animation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{animation: wiggle 2s ease-in-out;}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/animation accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: { animations: { spin: 'spin 1s linear infinite' } },
      rules: { 'design-token/animation': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{animation: spin 1s linear infinite;}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/animation warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/animation': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('animations'));
});
