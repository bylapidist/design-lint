import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/engine';

test('design-token/typography reports invalid font-size', async () => {
  const linter = new Linter({
    tokens: {
      typography: { fontSizes: { base: 16 }, fonts: { sans: 'Inter' } },
    },
    rules: { 'design-token/typography': 'error' },
  });
  const css = '.a{font-size:20px;}';
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});

test('design-token/typography handles multi-line font-family', async () => {
  const linter = new Linter({
    tokens: {
      typography: { fontSizes: { base: 16 }, fonts: { sans: 'Inter' } },
    },
    rules: { 'design-token/typography': 'error' },
  });
  const css = `.a{\n  font-family:\n    'Inter',\n    Arial;\n}`;
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});
