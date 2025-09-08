import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/node-adapter/linter.ts';
import { FileSource } from '../../src/node-adapter/file-source.ts';

void test('design-token/font-size reports invalid font-size', async () => {
  const linter = new Linter(
    {
      tokens: {
        fontSizes: { base: 16 },
        fonts: { sans: 'Inter' },
      },
      rules: { 'design-token/font-size': 'error' },
    },
    new FileSource(),
  );
  const css = '.a{font-size:20px;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/font-size accepts unit-based font-sizes', async () => {
  const linter = new Linter(
    {
      tokens: {
        fontSizes: { base: '1rem', lg: '2rem' },
        fonts: { sans: 'Inter' },
      },
      rules: { 'design-token/font-size': 'error' },
    },
    new FileSource(),
  );
  const valid = await linter.lintText(
    '.a{font-size:16px;} .b{font-size:1rem;}',
    'file.css',
  );
  assert.equal(valid.messages.length, 0);
  const invalid = await linter.lintText('.c{font-size:3rem;}', 'file.css');
  assert.equal(invalid.messages.length, 1);
});

void test('design-token/font-size warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/font-size': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.css');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.fontSizes'));
});
