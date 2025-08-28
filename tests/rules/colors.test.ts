import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/engine';

test('design-token/colors reports disallowed hex', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "#000000";', 'file.ts');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].ruleId, 'design-token/colors');
});

test('design-token/colors handles gradients', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const css = `.a{\n  background: linear-gradient(\n    #ffffff,\n    #000000\n  );\n}`;
  const res = await linter.lintText(css, 'file.css');
  assert.equal(res.messages.length, 1);
});
