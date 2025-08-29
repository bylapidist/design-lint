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

test('design-token/typography accepts unit-based font-sizes', async () => {
  const linter = new Linter({
    tokens: {
      typography: {
        fontSizes: { base: '1rem', lg: '2rem' },
        fonts: { sans: 'Inter' },
      },
    },
    rules: { 'design-token/typography': 'error' },
  });
  const valid = await linter.lintText(
    '.a{font-size:16px;} .b{font-size:1rem;}',
    'file.css',
  );
  assert.equal(valid.messages.length, 0);
  const invalid = await linter.lintText('.c{font-size:3rem;}', 'file.css');
  assert.equal(invalid.messages.length, 1);
});

test('design-token/typography warns when tokens missing', async () => {
  const linter = new Linter({
    rules: { 'design-token/typography': 'warn' },
  });
  const res = await linter.lintText('', 'file.css');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('typography'));
});
