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
