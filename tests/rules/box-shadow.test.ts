import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/node/file-source.ts';

void test('design-token/box-shadow reports disallowed value', async () => {
  const linter = new Linter(
    {
      tokens: { shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' } },
      rules: { 'design-token/box-shadow': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{box-shadow:0 2px 4px rgba(0,0,0,0.1);}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-token/box-shadow allows configured tokens', async () => {
  const linter = new Linter(
    {
      tokens: {
        shadows: {
          sm: '0 1px 2px rgba(0,0,0,0.1)',
          lg: '0 2px 4px rgba(0,0,0,0.2)',
        },
      },
      rules: { 'design-token/box-shadow': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{box-shadow:0 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2);}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/box-shadow warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/box-shadow': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.shadows'));
});
