import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/index.ts';
import { FileSource } from '../../src/index.ts';

void test('design-token/font-family reports invalid font-family', async () => {
  const linter = new Linter(
    {
      tokens: {
        fontSizes: { base: 16 },
        fonts: { sans: 'Inter' },
      },
      rules: { 'design-token/font-family': 'error' },
    },
    new FileSource(),
  );
  const css = `.a{\n  font-family:\n    'Inter',\n    Arial;\n}`;
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

void test('design-token/font-family warns when tokens missing', async () => {
  const linter = new Linter(
    {
      rules: { 'design-token/font-family': 'warn' },
    },
    new FileSource(),
  );
  const res = await linter.lintText('', 'file.css');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('tokens.fonts'));
});
