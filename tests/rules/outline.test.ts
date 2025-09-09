import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import { FileSource } from '../../src/adapters/node/file-source.ts';

void test('design-token/outline reports invalid value', async () => {
  const linter = new Linter(
    {
      tokens: { outlines: { focus: '2px solid #000' } },
      rules: { 'design-token/outline': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{outline:3px solid #000;}', 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/outline accepts valid values', async () => {
  const linter = new Linter(
    {
      tokens: { outlines: { focus: '2px solid #000' } },
      rules: { 'design-token/outline': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('.a{outline:2px solid #000;}', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/outline warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/outline': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('outlines'));
});
