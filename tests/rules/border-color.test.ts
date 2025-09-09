import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/node/file-source.ts';

void test('design-token/border-color reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { borderColors: { primary: '#ffffff' } },
      rules: { 'design-token/border-color': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{border-color:#000000;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/border-color accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: { borderColors: { primary: '#ffffff' } },
      rules: { 'design-token/border-color': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{border-color:#ffffff;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/border-color warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/border-color': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('borderColors'));
});
